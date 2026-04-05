import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const create_oracle_setting = (adminCap: string, oracleID: number) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::suipredict::create_oracle_setting`,
        arguments: [
            tx.object(adminCap),
            tx.pure.u32(oracleID),
        ]
    });
    return tx;
};