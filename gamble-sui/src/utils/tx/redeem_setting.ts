import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

// Supra OracleHolder shared object (same across all calls)
const ORACLE_HOLDER = "0x87ef65b543ecb192e89d1e6afeaf38feeb13c3a20c20ce413b29a9cbfbebd570";

export const redeem_setting = (adminCap: string, pool: string) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::suipredict::redeem_setting`,
        arguments: [
            tx.object(adminCap),
            tx.object(ORACLE_HOLDER),
            tx.object(pool),
            tx.object(`0x6`),   // Clock
        ]
    });
    return tx;
};
