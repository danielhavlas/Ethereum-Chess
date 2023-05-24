import { ethers, BigNumber } from "ethers";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../components/Header";
import { ContractContext } from "../../context/ContractContext";
import { RoomContext } from "../../context/RoomContext";
import { UserContext } from "../../context/UserContext";
import { LoadingContext } from "../../context/LoadingContext";
import { player, room, wagers } from "../../types/types";
import { CONTRACT_ADDRESS } from "../../utils/constants";
import ChessEth from "../../utils/ethers-utils/ChessEth.json";
import {
    joinRoom,
    listenForValue,
    onAuthStateChangedListener,
    validateLock,
    setStatus,
    signOutUser,
    deleteRoom,
    getRoom,
    getWagers,
    removeUserFromGroup,
} from "../../utils/firebase-utils/firebase.utils";
import { initGame } from "../chess/utils/Game";
import { JoinGameButton, CustomGameButton } from "./components/JoinGameButton";
import { CustomGame } from "./components/CustomGame";
import { DataSnapshot } from "firebase/database";

export default function Home() {
    const navigate = useNavigate();

    const { user, setUser } = useContext(UserContext);
    const { reset, roomNumber, setRoomNumber, group, setGroup, setYourColor, wallet, setWallet, wager, setWager, setOpponentWallet, lockingStatus, setLockingStatus, inQueue, setInQueue, gameOngoing, setGameOngoing, calledMatchFound, setCalledMatchFound} = useContext(RoomContext);
    const { contract, setContract } = useContext(ContractContext);
    const { createLoadingMessage } = useContext(LoadingContext);
    const [wagers, setWagers] = useState<wagers | null>(null);
    const [showCustomGame, setShowCustomGame] = useState(false)

    useEffect(() => {
        if (!window.ethereum) return;
        const provider = new ethers.providers.Web3Provider(
            window.ethereum as any
        );
        const signer = provider.getSigner();
        const contract_ = new ethers.Contract(
            CONTRACT_ADDRESS,
            ChessEth.abi,
            signer
        );
        setContract(contract_);

        const unsubscribe = onAuthStateChangedListener((user) => {
            if (user) {
                setUser(user);
                if(user.displayName) {
                    setWallet(user.displayName);
                }
            } else {
                
                setUser(null);
                setWallet(null);
            }
        });
        if (!wallet) {
            signOutUser();
        }


        return unsubscribe;
    }, []);
    
    useEffect(() => {
        try {
            const getWagersFromStore = async () => {
                const wagers = await getWagers();
                setWagers(wagers);
            };
            if(user && !wagers) {
                getWagersFromStore();
            }
        } catch (error) {}
    }, [user]);

    useEffect(() => {
        // if(!inQueue && group && roomNumber && user) {
        // deleteRoom(group, roomNumber, "leave-queue");
        // }
    }, [inQueue]);


    useEffect(() => {
        if (!user || !group || !roomNumber) return;
        const joinRoom = listenForValue(
            `${group}/${roomNumber}/status`,
            async (snapshot: DataSnapshot) => {
                try {
                    const status = snapshot.val()
                    if (status === 'locking') {
                        const data = await getRoom(group, roomNumber);
                        const _opponent =
                            data.players[0].id === user.uid
                                ? data.players[1]
                                : data.players[0];

                        if (_opponent != null && !calledMatchFound) {
                            setOpponentWallet(_opponent.wallet);
                            setYourColor(data.players[0].id === user.uid? data.players[0].piece: data.players[1].piece);
                            matchFound();
                        }
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        );

        const startGame = listenForValue(
            `${group}/${roomNumber}`,
            (snapshot: DataSnapshot) => {
                const room = snapshot.val() as room;
                if(!room) return
                if (room.status === "locking") {
                    if ( room.players[0].locked && room.players[1].locked) {
                        setGameOngoing(true);
                        initGame(group, roomNumber, user);
                        setStatus(group, roomNumber, "onGoing");
                        navigate(`/${group}/${roomNumber}`);
                    }
                }
            }
        );
        return () => {
            if(joinRoom) joinRoom()
            if(startGame) startGame()
        }
    }, [roomNumber]);

    const findMatch = async (_wager: string, _group: string) => {
        try {
            if (!window.ethereum || !user || !wallet || !contract || inQueue || roomNumber) return;
            setInQueue(true);
            const provider = new ethers.providers.Web3Provider(window.ethereum as any);
            const balance = await provider.getBalance(wallet) as BigNumber;
            const lockedTokens = await contract.lockedTokensOfAddress(wallet) as BigNumber;
            if (balance.add(lockedTokens).lt(ethers.utils.parseEther(_wager))) {
                reset()
                return createLoadingMessage("Not enough balance in wallet", "fail");
            }
            setWager(_wager);
            createLoadingMessage('Joining room ...','loading')
            const {data} = await joinRoom(_group, wallet) as any
            const rNum = data.toString()
            if((parseFloat(rNum) >= 0)) {
                setRoomNumber(rNum)
                setGroup(_group);
                createLoadingMessage('Joined room','success')
            } else {
                throw new Error()
            }
        } catch (error) {
            console.log(error);
            reset()
            createLoadingMessage('Failed to join room', "fail");
        }
    };

    const matchFound = () => {
        if (!wager || lockingStatus != "not-locking" || calledMatchFound)
            return;
        lockTokens();
    };

    const lockTokens = async () => {

        if (
            !contract ||
            !user ||
            !roomNumber ||
            !group ||
            !wager ||
            !wallet ||
            gameOngoing ||
            calledMatchFound
        )
            return;
        try {
            setCalledMatchFound(true);
            const lockedTokens = await contract.lockedTokensOfAddress(wallet);

            setLockingStatus("locking");
            createLoadingMessage('Locking tokens...', "loading");

            const room = await getRoom(group, roomNumber)

            const wagerInBig = ethers.utils.parseEther(room.wager);

            const fillUpWager = wagerInBig.sub(lockedTokens).isNegative()
                ? BigNumber.from(0)
                : wagerInBig.sub(lockedTokens);

            const randomLoseCode = BigNumber.from(
                Math.ceil(Math.random() * 10 ** 8)
            );
            const randomDrawCode = BigNumber.from(
                Math.ceil(Math.random() * 10 ** 8)
            );
            const joinTxn = await contract.lockTokens(
                randomLoseCode,
                randomDrawCode,
                wagerInBig,
                {
                    value: fillUpWager,
                }
            );
            const signTimeOut = setTimeout(() =>{throw new Error('Sign expired')}, 30000)
            await joinTxn.wait();
            clearTimeout(signTimeOut)
            validateLock(group, roomNumber, wallet, wager);
            setLockingStatus("locked");
            createLoadingMessage('Tokens locked', "success");
        } catch (e) {
            console.log(e);
            createLoadingMessage('Failed to lock tokens', "fail");
            setLockingStatus("not-locking");
            setCalledMatchFound(false);
            reset();
            if (!group || !roomNumber) return;
            deleteRoom(group, roomNumber, "failed-lock");
        }
    };

    const leaveQueue = () => {
        if (roomNumber && group && user) {
            deleteRoom(group, roomNumber, "leave-queue");
        };
        reset();
        setInQueue(false)
    };

    return (
        <div className="home-page">
            <Header />
            {user && wallet && !showCustomGame? (
                <>
                    <div className="container">
                        <div className="join-game-buttons">
                            {wagers !== null && (
                                <>
                                    <JoinGameButton
                                        wager={wagers.low}
                                        group={"group_1"}
                                        findMatch={findMatch}
                                        piece={"p"}
                                    />
                                    <JoinGameButton
                                        wager={wagers.medium}
                                        group={"group_2"}
                                        findMatch={findMatch}
                                        piece={"n"}
                                    />
                                    <JoinGameButton
                                        wager={wagers.high}
                                        group={"group_3"}
                                        findMatch={findMatch}
                                        piece={"q"}
                                    />
                                    <CustomGameButton showCustomGame={() => setShowCustomGame(true)}/>
                                </>
                            )}
                        </div>
                        {inQueue && roomNumber && (
                            <button
                                className="button button--leave-queue fs-5"
                                onClick={leaveQueue}
                            >
                                Leave queue
                            </button>
                        )}
                    </div>
                </>
            ) : user && wallet && showCustomGame? <CustomGame showCustomGame={() => setShowCustomGame(false)} />
             : (
                <div className="container grid--container">
                    <div>
                        <h1 className="text-accent fs-1 lh1">Chess.eth</h1>
                        <h2>
                            <span className="text-white">WIN CHESS,</span>
                            <span className="text-accent"> WIN ETH</span>
                        </h2>
                        <h3>CONNECT WALLET TO PLAY</h3>
                    </div>
                    <div></div>
                </div>
            )}
        </div>
    );
}
