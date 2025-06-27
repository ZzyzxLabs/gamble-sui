module suipredict::suipredict {

    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self,Balance};
    use sui::sui::SUI;
    use sui::coin::{Self, Coin, into_balance, from_balance};
    use SupraOracle::SupraSValueFeed::{get_price, OracleHolder};

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
            canRedeem: false
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

    // public fun redeem()
}