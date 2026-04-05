module suipredict::suipredict {

    // import model
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self,Balance};
    use sui::sui::SUI;
    use sui::coin::{Self, Coin, into_balance, from_balance};
    use sui::clock::{Self, Clock};
    use SupraOracle::SupraSValueFeed::{get_price, OracleHolder};

    // declare constants
    const ECanNotRedeem: u64 = 0;
    const ETimeNotReached: u64 = 1;
    const EAccessDenied: u64 = 403;
    const ENotWinner: u64 = 2;

    // declare types
    // declare oracle ID
    public struct OracleSetting has key, store {
        id: UID,
        oracleID: u32
    }

    // declare pool
    public struct Pool has key {
        id: UID,
        balance: Balance<SUI>,
        price: u64,
        idT: vector<TicketCopy>,
        fixed_price: u64,
        canRedeem: bool,
        indices: vector<u64>,
        end_time: u64,
        oracleSetting: OracleSetting
    }

    // declare ticket
    public struct Ticket has key, store {
        id: UID,
        pool_id: ID,
        price: u64,
    }

    // declare ticket copy
    public struct TicketCopy has key, store {
        id: UID,
        copy_id: ID,
        price: u64,
    }

    // declare admin
    public struct AdminCap has key, store {
        id: UID
    }

    // init
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        transfer::transfer(admin_cap, ctx.sender());
    }

    // start game
    public fun start_game(
        admin_cap: &AdminCap,
        oracleHolder: &OracleHolder,
        oracleID: u32,
        p_price: u64,
        end_time: &Clock,
        ctx: &mut TxContext
    ) {
        // Create oracle setting
        let oracleSetting = create_oracle_setting(admin_cap, oracleID, ctx);

        // Create prize pool
        create_pool(admin_cap, p_price, end_time, oracleSetting, ctx);
    }

    // Administrator sets oracle
    public fun create_oracle_setting(
        admin_cap: &AdminCap,
        oracleID: u32,
        ctx: &mut TxContext
    ): OracleSetting {
        let oracle_setting = OracleSetting {
            id: object::new(ctx),
            oracleID: oracleID
        };
        oracle_setting
    }

    // Administrator creates a new prize pool
    public fun create_pool(
        admin: &AdminCap,
        p_price: u64,
        clock: &Clock,
        oracleSetting: OracleSetting,
        ctx: &mut TxContext
    ) {
        let pool = Pool {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
            price: p_price,
            idT: vector::empty<TicketCopy>(),
            fixed_price: 0,
            canRedeem: false,
            indices: vector::empty<u64>(),
            end_time: clock::timestamp_ms(clock) + 100000,  //259_200_000
            oracleSetting: oracleSetting
        };
        transfer::share_object(pool);
    }

    // Player buys a ticket
    public fun buy_ticket(
        pool: &mut Pool,
        in_coin: Coin<SUI>,
        pPrice: u64,
        ctx: &mut TxContext
    ) {
        balance::join(&mut pool.balance, into_balance(in_coin));
        let ticket = Ticket {
            id: object::new(ctx),
            pool_id: object::id(pool),
            price: pPrice
        };
        let ticket_copy = TicketCopy {
            id: object::new(ctx),
            copy_id: object::id(&ticket),
            price: pPrice
        };
        vector::push_back<TicketCopy>(&mut pool.idT, ticket_copy);
        transfer::public_transfer(ticket, ctx.sender());
    }

    // Raise 10 to the power of exp (u128 to avoid intermediate overflow)
    fun pow10(exp: u64): u128 {
        let mut result = 1u128;
        let mut i = 0u64;
        while (i < exp) {
            result = result * 10;
            i = i + 1;
        };
        result
    }

    // Normalize raw oracle price to the same 1e9 scale used by ticket price predictions.
    // Ticket prices are stored as (user_value * 1e9), so we do:
    //   normalized = raw_price / 10^decimal * 10^9  =  raw_price / 10^(decimal - 9)
    fun normalize_price(raw: u128, decimal: u16): u64 {
        let dec = decimal as u64;
        let target: u64 = 9;
        if (dec >= target) {
            (raw / pow10(dec - target)) as u64
        } else {
            (raw * pow10(target - dec)) as u64
        }
    }

    // Fetch actual price from oracle (standalone helper — also called inside redeem_setting)
    public fun fixed_price(
        admin: &AdminCap,
        oracleHolder: &OracleHolder,
        pool: &mut Pool,
    ) {
        let (price, decimal, _, _) = get_price(oracleHolder, pool.oracleSetting.oracleID);
        pool.fixed_price = normalize_price(price, decimal);
    }

    // Redemption mechanism — fetches oracle price then determines winners atomically
    public fun redeem_setting(
        admin: &AdminCap,
        oracleHolder: &OracleHolder,
        pool: &mut Pool,
        current_time: &Clock,
    ) {
        // Check if settlement is allowed
        assert!(clock::timestamp_ms(current_time) >= pool.end_time, ETimeNotReached);

        // Snapshot and normalize oracle price to 1e9 scale (same as ticket predictions)
        let (price, decimal, _, _) = get_price(oracleHolder, pool.oracleSetting.oracleID);
        pool.fixed_price = normalize_price(price, decimal);

        let fixed_price = pool.fixed_price;
        let v_len = vector::length<TicketCopy>(&pool.idT);

        // No tickets: mark redeemable (nothing to pay out) and return
        if (v_len == 0) {
            pool.canRedeem = true;
            return
        };

        let mut v_gap = vector::empty<u64>();
        let mut i = 0;

        while (i < v_len) {
            let b_ticket = vector::borrow<TicketCopy>(&pool.idT, i);
            let gap = if (b_ticket.price > fixed_price) {
                b_ticket.price - fixed_price
            } else {
                fixed_price - b_ticket.price
            };
            vector::push_back<u64>(&mut v_gap, gap);
            i = i + 1;
        };

        let v_len_gap = vector::length<u64>(&v_gap);
        let mut min_val = *vector::borrow<u64>(&v_gap, 0);
        // Reset indices before recomputing (guards against double-settling)
        pool.indices = vector::empty<u64>();
        vector::push_back<u64>(&mut pool.indices, 0);
        let mut i_gap = 1;

        while (i_gap < v_len_gap) {
            let b_gap = *vector::borrow(&v_gap, i_gap);
            if (b_gap < min_val) {
                min_val = b_gap;
                pool.indices = vector::empty<u64>();
                vector::push_back<u64>(&mut pool.indices, i_gap);
            } else if (b_gap == min_val) {
                vector::push_back<u64>(&mut pool.indices, i_gap);
            };
            i_gap = i_gap + 1;
        };
        pool.canRedeem = true;
    }

    // Winners redeem prize — ticket is consumed to prevent double-spend
    public fun redeem(
        ticket: Ticket,
        pool: &mut Pool,
        ctx: &mut TxContext
    ) {
        assert!(pool.canRedeem, ECanNotRedeem);
        assert!(ticket.pool_id == object::id(pool), EAccessDenied);

        let len_indices = vector::length<u64>(&pool.indices);
        let mut i = 0;
        let mut is_winner = false;

        while (i < len_indices) {
            let index = *vector::borrow<u64>(&pool.indices, i);
            let b_ticket = vector::borrow<TicketCopy>(&pool.idT, index);
            if (object::id(&ticket) == b_ticket.copy_id) {
                let s_prize = balance::value<SUI>(&pool.balance) / (len_indices as u64);
                let coin = coin::take<SUI>(&mut pool.balance, s_prize, ctx);
                transfer::public_transfer(coin, ctx.sender());
                is_winner = true;
            };
            i = i + 1;
        };

        // Assert caller is a winner — prevents losers from burning their ticket for nothing
        assert!(is_winner, ENotWinner);

        // Consume the ticket to prevent double-redemption
        let Ticket { id, .. } = ticket;
        id.delete();
    }
}
