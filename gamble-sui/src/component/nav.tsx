"use client";

import { ConnectButton } from "@mysten/dapp-kit";

interface NavBarProps {
    onTicketClick: () => void;
    onAdminClick: () => void;
}

function NavBar({ onTicketClick, onAdminClick }: NavBarProps) {
    return (
        <nav className="bg-gray-900 text-white px-8 py-4 flex justify-between items-center w-full sticky top-0">
            <div className="flex gap-8">
                <a
                    onClick={onTicketClick}
                    className="text-white text-base no-underline transition-colors duration-200 hover:text-gray-300"
                >
                    Ticket
                </a>
                <a
                    onClick={onAdminClick}
                    className="text-white text-base no-underline transition-colors duration-200 hover:text-gray-300"
                >
                    Admin
                </a>
            </div>
            <ConnectButton />
        </nav>
    );
};

export default NavBar;
