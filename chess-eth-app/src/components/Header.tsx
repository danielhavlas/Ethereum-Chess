import { useContext, useState } from "react";
import { signInGuest } from "../utils/firebase-utils/firebase.utils";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import infoIcon from "../svgs/infoIcon.svg";

import { UserContext } from "../context/UserContext";
import { RoomContext } from "../context/RoomContext";
import kingB from "../features/chess/svgs/k-b.svg";
import queenW from "../features/chess/svgs/q-w.svg";

function Header() {

    const { user } = useContext(UserContext);
    const { wallet, setWallet } = useContext(RoomContext);

    const [showGuide, setShowGuide] = useState(false);

    const { connectAsync, connectors } = useConnect()
    const {isConnected} = useAccount()
    const {disconnectAsync} = useDisconnect()


    const handleAuth = async() => {
        if (isConnected) {
            await disconnectAsync();
        }
        connectAsync({connector: connectors[0]}).then(data => {
            setWallet(data.account)
            signInGuest(data.account)
        })
    }


    const connectGuide = (
        <div className={`guide guide--${showGuide ? "show" : "hide"}`}>
            <p>
                Connect your wallet. We use the Arbitrum network to give users a
                faster experience and less gas fees.
                <a
                    target={"_blank"}
                    href="https://coinmarketcap.com/alexandria/article/how-to-add-arbitrum-to-metamask"
                >
                    To learn how to connect to Arbitrum click here!
                </a>
            </p>
        </div>
    );
    const gameGuide = (
        <div className={`guide guide--${showGuide ? "show" : "hide"}`}>
            <p>
                Select your wager amount and you will be placed in matchmaking
                queue. Once a match is found, sign the transaction to confirm
                and lock your wager. Now good luck! The ball is in your hands.
                Upon your victory claim your winnings. In case of a draw your
                wager is returned. If you lose… you know what happens.
            </p>
        </div>
    );

    const walletStr = `${wallet?.slice(0, 6)}..`;

    return (
        <header className="header">
            <div className="logo">
                <div className="logo-img">
                    <img src={kingB} alt="" />
                    <img src={queenW} alt="" />
                </div>
            </div>
            {!user && (
                <nav className="header-nav">
                    {connectGuide}
                    <img
                        className="pointer"
                        onClick={() => setShowGuide((prev) => !prev)}
                        src={infoIcon}
                        alt=""
                    />
                    <button
                        className="button header--button"
                        onClick={handleAuth}
                    >
                        CONNECT WALLET
                    </button>
                </nav>
            )}
            {user && (
                <nav className="header-nav">
                    {gameGuide}
                    <img
                        className="pointer"
                        onClick={() => setShowGuide((prev) => !prev)}
                        src={infoIcon}
                        alt=""
                    />
                    <p className="fs-4">{walletStr}</p>
                </nav>
            )}
        </header>
    );
}

export default Header;
