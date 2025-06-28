module suipredict::suipredict {

    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self,Balance};
    use sui::sui::SUI;
    use sui::coin::{Self, Coin, into_balance, from_balance};
    use SupraOracle::SupraSValueFeed::{get_price, OracleHolder};

    const ECanNotRedeem: u64 = 0;

    public struct OracleSetting has key, store {
        id: UID,
        oracleID: u32
    }
    public struct Pool has key {
        id: UID,
        balance: Balance<SUI>,
        price: u8,
        idT: vector<TicketCopy>,
        fixed_price: u128,
        canRedeem: bool
    }
    
    public struct Ticket has key, store {
        id: UID,
        pool_id: ID,
        price: u128,
    }

    public struct TicketCopy has key, store {
        id: UID,
        copy_id: ID,
        price: u128,
    }

    public struct AdminCap has key, store {
        id: UID
    }

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        transfer::transfer(admin_cap, ctx.sender());
    }

    public fun create_pool(admin: &AdminCap, p_price: u8, ctx: &mut TxContext){
        let pool = Pool {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
            price: p_price,
            idT: vector::empty<TicketCopy>(),
            fixed_price: 0,
            canRedeem: false,
        };
        transfer::share_object(pool);
    }

    public fun buy_ticket(pool: &mut Pool, in_coin: &mut Coin<SUI>, pPrice: u128 ,ctx: &mut TxContext){
        let buy_coin = coin::split(in_coin, (pool.price as u64), ctx);
        balance::join(&mut pool.balance, into_balance(buy_coin));
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

    public fun fixed_price(oracleHolder: &OracleHolder, pool: &mut Pool, setting: &OracleSetting, ctx: &mut TxContext) {
        let (price, decimal_u16, _, _) = get_price(oracleHolder, setting.oracleID);
        pool.fixed_price = price;
        pool.canRedeem = true;
    }

    public fun redeem_setting(ticket: &mut Ticket, pool: &mut Pool, ctx: &mut TxContext) {
        assert!(pool.canRedeem, ECanNotRedeem);
        let fixed_price = pool.fixed_price;
        let v_len = vector::length<TicketCopy>(&pool.idT);
        let mut v_gap = vector::empty<u128>();
        let mut i = 0;
        while (i < v_len) {
            b_ticket = vector::borrow<TicketCopy>(&pool.idT, i);
            let gap = b_ticket.price - fixed_price;
            vector::push_back<u128>(&mut v_gap, gap);
            i = i + 1;
        }
        let v_len_gap = vector::length<u128>(&v_gap);
        let mut min_val: u128 = *vector::borrow<u128>(v, 0);
        let mut indices = vector::empty<u64>();
        let mut i_gap = 0;
        while (i_gap < v_len_gap) {
            let b_gap = vector::borrow<u128>(&v_gap, i_gap);
            if (b_gap < min_val) {
                min_val = b_gap;
                indices = vector::empty<u64>();
                vector::push_back<u64>(&mut indices, i_gap as u64);
            } else if (b_gap == min_val) {
                vector::push_back<u64>(&mut indices, i_gap as u64);
            }
            i_gap = i_gap + 1;
        };
    }
}