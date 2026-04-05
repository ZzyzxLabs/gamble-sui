import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

// Supra OracleHolder shared object
const ORACLE_HOLDER = "0x87ef65b543ecb192e89d1e6afeaf38feeb13c3a20c20ce413b29a9cbfbebd570";

export const fixed_price = (adminCap: string, pool: string) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::suipredict::fixed_price`,
        arguments: [
            tx.object(adminCap),
            tx.object(ORACLE_HOLDER),
            tx.object(pool),
        ]
    });
    return tx;
};
