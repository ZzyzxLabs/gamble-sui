import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const start_game = (adminCap, oracleHolder, oracleID, p_price) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::suipredict::start_game`,
        arguments: [
            tx.object(adminCap),
            tx.object(oracleHolder),
            tx.pure.u32(oracleID),
            tx.pure.u64(p_price), //need to change type in contract
            tx.object(`0x6`)
        ]
    });
    return tx;
};