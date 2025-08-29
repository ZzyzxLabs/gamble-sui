import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";
import { coinWithBalance } from "@mysten/sui/transactions";

export const buyTicket = (pool, in_coin,ticketPrice,pPrice,sender) => {
    const tx = new Transaction();
    const con = coinWithBalance({balance:ticketPrice,useGasCoin:true});
    tx.moveCall({
        target: `${package_addr}::suipredict::buy_ticket`,
        arguments: [
            tx.object(pool),
            con,
            tx.pure.u64(pPrice), // need to change type in contract
        ]
    });
    return tx;
};