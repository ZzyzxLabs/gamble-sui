import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const redeem_setting = (adminCap, pool) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::suipredict::redeem_setting`,
        arguments: [
            tx.object(adminCap),
            tx.object(pool),
            tx.object(`0x6`)
        ]
    });
    return tx;
};