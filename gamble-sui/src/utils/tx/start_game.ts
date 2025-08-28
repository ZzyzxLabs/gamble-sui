import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const start_game = (adminCap, p_price) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::suipredict::start_game`,
        arguments: [
            tx.object(adminCap),
            tx.object("0x87ef65b543ecb192e89d1e6afeaf38feeb13c3a20c20ce413b29a9cbfbebd570"),
            tx.pure.u32(90),
            tx.pure.u64(p_price), //need to change type in contract
            tx.object(`0x6`)
        ]
    });
    return tx;
};