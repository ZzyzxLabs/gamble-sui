import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const buyTicket = (pool: string, _in_coin: unknown, ticketPrice: number, pPrice: number, sender: string) => {
    const tx = new Transaction();
    tx.setSender(sender);
    const con = coinWithBalance({ balance: ticketPrice });
    tx.moveCall({
        target: `${package_addr}::suipredict::buy_ticket`,
        arguments: [
            tx.object(pool),
            con,
            tx.pure.u64(pPrice),
        ]
    });
    return tx;
};
