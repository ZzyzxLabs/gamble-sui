import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const fixed_price = (pool, oracleSetting) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::suipredict::fixed_price`,
        arguments: [
            tx.object("0x87ef65b543ecb192e89d1e6afeaf38feeb13c3a20c20ce413b29a9cbfbebd570"),
            tx.object(pool),
            tx.object(oracleSetting)
        ]
    });
    return tx;
};