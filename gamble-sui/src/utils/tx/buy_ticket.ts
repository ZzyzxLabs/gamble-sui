import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";
import { coinWithBalance } from "@mysten/sui/transactions";

export const buyTicket = (pool, in_coin, pPrice) => {
    const tx = new Transaction();

    const suiCoinInput = coinWithBalance({
        balance: pPrice,
        useGasCoin: true, // keep the original gas coin for fee
      });

    tx.moveCall({
        target: `${package_addr}::suipredict::buy_ticket`,
        arguments: [
            tx.object(pool),
            suiCoinInput,
            tx.pure.u64(pPrice), // need to change type in contract
        ]
    });
    return tx;
};