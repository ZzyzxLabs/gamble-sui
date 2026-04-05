import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const create_pool = (adminCap: string, p_price: number | string) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::suipredict::create_pool`,
        arguments: [
            tx.object(adminCap),
            tx.pure.u64(p_price), //need to change type in contract
            tx.object(`0x6`)
        ]
    });
    return tx;
};