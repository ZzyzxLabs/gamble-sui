module suipredict::suipredict {

    // 引用模組
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self,Balance};
    use sui::sui::SUI;
    use sui::coin::{Self, Coin, into_balance, from_balance};
    use sui::clock::{Self, Clock};
    use SupraOracle::SupraSValueFeed::{get_price, OracleHolder};

    // 定義常數
    const ECanNotRedeem: u64 = 0;
    const ETimeNotReached: u64 = 1;
    const EAccessDenied: u64 = 403;

    // 定義結構
    // 預言機配置
    public struct OracleSetting has key, store {
        id: UID,
        oracleID: u32
    }

    // 定義獎池
    public struct Pool has key {
        id: UID,
        balance: Balance<SUI>,
        price: u8,
        idT: vector<TicketCopy>,
        fixed_price: u128,
        canRedeem: bool,
        prize: Balance<SUI>,
        indices: vector<u64>,
        start_time: &Clock,
        end_time: &Clock
    }
    
    // 定義票券
    public struct Ticket has key, store {
        id: UID,
        pool_id: ID,
        price: u128,
    }

    // 定義票券副本
    public struct TicketCopy has key, store {
        id: UID,
        copy_id: ID,
        price: u128,
    }

    // 定義管理員
    public struct AdminCap has key, store {
        id: UID
    }

    // 部署時執行
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        transfer::transfer(admin_cap, ctx.sender());
    }

    // 啟動遊戲
    public fun start_game(
        admin_cap: &AdminCap,
        oracleHolder: &OracleHolder,
        oracleID: u32,
        p_price: u8,
        start_time: &Clock,
        end_time: &Clock,
        ctx: &mut TxContext
    ) {
        // 檢查管理員權限
        assert!(object::id(admin_cap) == ctx.sender(), EAccessDenied);
        
        // 創建預言機設置
        create_oracle_setting(admin_cap, oracleID, ctx);
        
        // 創建獎池
        create_pool(admin_cap, p_price, start_time, end_time, ctx);
    }

    // 管理員設置預言機
    public fun create_oracle_setting(
        admin_cap: &AdminCap,
        oracleID: u32,
        ctx: &mut TxContext
    ) {
        let oracle_setting = OracleSetting {
            id: object::new(ctx),
            oracleID: oracleID
        };
        transfer::share_object(oracle_setting);
    }

    // 管理員創建一個新的獎池
    public fun create_pool(
        admin: &AdminCap,
        p_price: u8,
        start_time: &Clock,
        end_time: &Clock,
        ctx: &mut TxContext
    ) {
        let pool = Pool {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
            price: p_price,
            idT: vector::empty<TicketCopy>(),
            fixed_price: 0,
            canRedeem: false,
            prize: balance::zero<SUI>(),
            indices: vector::empty<u64>(),
            start_time: clock::timestamp_ms(start_time)
            end_time: clock::timestamp_ms(end_time)
        };
        transfer::share_object(pool);
    }

    // 玩家購買票券
    public fun buy_ticket(
        pool: &mut Pool,
        in_coin: &mut Coin<SUI>,
        pPrice: u128,
        ctx: &mut TxContext
    ) {
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

    // 從預言機獲取實際價格
    public fun fixed_price(
        oracleHolder: &OracleHolder,
        pool: &mut Pool,
        setting: &OracleSetting,
        ctx: &mut TxContext
    ) {
        let (price, decimal_u16, _, _) = get_price(oracleHolder, setting.oracleID);
        pool.fixed_price = price;
    }

    // 兌換獎勵機制
    public fun redeem_setting(
        ticket: &mut Ticket,
        pool: &mut Pool,
        current_time: &Clock,
        ctx: &mut TxContext
    ) {
        // 檢查是否可以結算
        assert!(clock::timestamp_ms(current_time) >= pool.end_time, ETimeNotReached);

        let fixed_price = pool.fixed_price;
        let v_len = vector::length<TicketCopy>(&pool.idT);
        let mut v_gap = vector::empty<u128>();
        let mut i = 0;

        while (i < v_len) {
            let b_ticket = vector::borrow<TicketCopy>(&pool.idT, i);
            let gap = b_ticket.price - fixed_price;
            vector::push_back<u128>(&mut v_gap, gap);
            i = i + 1;
        };

        let v_len_gap = vector::length<u128>(&v_gap);
        let mut min_val = *vector::borrow<u128>(&v_gap, 0);
        let mut i_gap = 0;

        while (i_gap < v_len_gap) {
            let b_gap = *vector::borrow(&v_gap, i_gap);
            if (b_gap < min_val) {
                min_val = b_gap;
                pool.indices = vector::empty<u64>();
                vector::push_back<u64>(&mut pool.indices, i_gap as u64);
            } else if (b_gap == min_val) {
                vector::push_back<u64>(&mut pool.indices, i_gap as u64);
            };
            i_gap = i_gap + 1;
        };
        pool.canRedeem = true;
    }

    // 贏家兌換獎金
    public fun redeem(
        ticket: &mut Ticket,
        pool: &mut Pool,
        ctx: &mut TxContext
    ) {
        assert!(pool.canRedeem, ECanNotRedeem);
        let len_indices = vector::length<u64>(&pool.indices);
        let mut i = 0;

        while (i < len_indices) {
            let index = *vector::borrow<u64>(&pool.indices, i);
            let b_ticket = vector::borrow<TicketCopy>(&pool.idT, index);
            if (object::id(ticket) == b_ticket.copy_id) {
                let s_prize = balance::value<SUI>(&pool.prize) / (len_indices as u64);
                let mut coin = coin::take<SUI>(&mut pool.prize, s_prize, ctx);
                transfer::public_transfer(coin, ctx.sender());
            };
            i = i + 1;
        }
    }
}
