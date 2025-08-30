import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const fixed_price = (adminCap, oracleHolder, pool) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::suipredict::fixed_price`,
        arguments: [
            tx.object(adminCap),
            tx.object(oracleHolder),
            tx.object(pool)
        ]
    });
    return tx;
};