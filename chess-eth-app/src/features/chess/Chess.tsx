import { useEffect, useState, useContext } from "react";
import "./chess.css";
import { ethers, BigNumber } from "ethers";
import { Link, useParams } from "react-router-dom";

import Board from "./components/Board";
import { gameSub, room } from "../../types/types";
import { gameSubject, getSubject } from "./utils/Game";
import { RoomContext } from "../../context/RoomContext";
import { UserContext } from "../../context/UserContext";
import { LoadingContext } from "../../context/LoadingContext";
import { ContractContext } from "../../context/ContractContext";
import {
    deleteRoom,
    onAuthStateChangedListener,
    getGameOver,
    callTimeOver,
    getCode,
} from "../../utils/firebase-utils/firebase.utils";
import { CONTRACT_ADDRESS } from "../../utils/constants";
import ChessEth from "../../utils/ethers-utils/ChessEth.json";
import { formatSeconds } from "../../utils/formatSeconds";

export default function Chess() {
    const {
        reset,
        roomNumber,
        setRoomNumber,
        group,
        yourColor,
        setGameOver,
        wallet,
        opponentWallet,
        setGroup,
        setWallet,
        setYourColor,
        setOpponentWallet,
    } = useContext(RoomContext);

    const params = useParams();


    const { contract, setContract } = useContext(ContractContext);
    const { user, setUser } = useContext(UserContext);
    const { createLoadingMessage } = useContext(LoadingContext);

    const [board, setBoard] = useState([]);
    const [turn, setTurn] = useState("");
    const [result, setResult] = useState("");
    const [isGameOver, setIsGameOver] = useState(false);
    const [claimed, setClaimed] = useState(false);

    const [yourBalance, setYourBalance] = useState<number>(0);
    const [sumBalances, setSumBalances] = useState<number>(0);
    const turnTime = 120;
    const gameTime = 600;
    const [yourTurnTimer, setYourTurnTimer] = useState(turnTime);
    const [oppTurnTimer, setOppTurnTimer] = useState(turnTime);
    const [yourTimeLeft, setYourTimeLeft] = useState(gameTime);
    const [oppTimeLeft, setOppTimeLeft] = useState(gameTime);


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
                setWallet(user.displayName);
            } else {
                setUser(null);
                setWallet(null);
            }
        });

        if ((!group || !roomNumber) && params.group && params.room) {
            setGroup(params.group);
            setRoomNumber(params.room);
        }
        let subscribe: any;
        if (!gameSubject) {
            if (!group || !user || !roomNumber) return;
            getSubject(group, roomNumber, user);
        }

        subscribe = gameSubject.subscribe(async (room: room) => {
            if(!room) return;
            const game = room.game as gameSub;
            const playerIds = room.players.map((v) => v.id);
            if (!user || !playerIds.includes(user.uid) || !group || !roomNumber) return;
            setBoard(game.board);
            setTurn(game.turn);
            setIsGameOver(game.gameOver);
            
            
            const turnTimeLeft = parseInt(((game.startTime - Date.now() + turnTime * 1000) / 1000).toFixed())
            
            if(isNaN(turnTimeLeft)){
                setYourTurnTimer(turnTime)
                setOppTurnTimer(turnTime)
            } else if(turnTimeLeft < 0) {
                setYourTurnTimer(0)
                setOppTurnTimer(0)
            } else {
                setYourTurnTimer(turnTimeLeft)
                setOppTurnTimer(turnTimeLeft)
            }
            const thisPlayer = room.players.find(p => p.id === user.uid)
            const oppPlayer = room.players.find(p => p.id !== user.uid)
            if(thisPlayer){
                const gameTimeLeft = parseInt(((thisPlayer.gameTimeLeft) / 1000).toFixed())
                console.log(gameTimeLeft);
                
                setYourTimeLeft(gameTimeLeft)
            }
            if(oppPlayer){
                const gameTimeLeft = parseInt(((oppPlayer.gameTimeLeft) / 1000 ).toFixed())
                setOppTimeLeft(gameTimeLeft)
            }
            

            setYourColor(
                room.players[0].id === user.uid
                ? room.players[0].color
                : room.players[1].color
                );
                
            const opp = room.players[0].id === user.uid? room.players[1] : room.players[0];
            const oppWallet_ = opp.wallet;

            setOpponentWallet(oppWallet_);
            if (game.gameOver && !result) {
                await getGameOver(group, roomNumber)
                const result = game.winner === user.uid? 'win' : game.winner === 'draw'? 'draw' : game.winner === opp.id? 'loss' : null
                if(!result) return;
                setResult(result)
                const getBalance = async () => {
                    if (!contract) return;
                    const yourTokens = await contract.lockedTokensOfAddress(
                        wallet
                    );
                    const oppTokens = await contract.lockedTokensOfAddress(
                        oppWallet_
                    );
                    setYourBalance(
                        parseFloat(ethers.utils.formatEther(yourTokens))
                    );
                    parseFloat(ethers.utils.formatEther(oppTokens));
                    setSumBalances(
                        parseFloat(ethers.utils.formatEther(yourTokens)) +
                            parseFloat(ethers.utils.formatEther(oppTokens))
                    );
                };
                getBalance();
                if (result === "loss") {
                    reset();
                }
                return () => subscribe && subscribe.unsubscribe();
            }
        });
        return () => subscribe && subscribe.unsubscribe();
    }, [gameSubject, group, user]);

    useEffect(() => {
        if(!board[0]) return;
        const timer = setInterval(() => {
            if(!board[0]) return;
            if (turn === yourColor) {
                setYourTurnTimer((time) =>{
                    if(time <= 0) return 0
                    return time - 1
                });
                setYourTimeLeft((time) =>{
                    if(time <= 0) return 0
                    return time - 1
                });
            } else {
                setOppTurnTimer((time) =>{
                    if(time <= 0) return 0
                    return time - 1
                });
                setOppTimeLeft((time) =>{
                    if(time <= 0) return 0
                    return time - 1
                });
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [turn]);

    useEffect(() => {
        if (
            turn == yourColor ||
            oppTurnTimer > 0 ||
            !group ||
            !roomNumber || !board[0]
            ) return;
            const cd = setInterval(() => {
                callTimeOver(group, roomNumber);
            },10000)
            if(isGameOver) {
                clearInterval(cd)
            }
        
        return () => clearInterval(cd)
    }, [oppTurnTimer]);
    useEffect(() => {
        if (
            turn == yourColor ||
            oppTimeLeft > 0 ||
            !group ||
            !roomNumber || !board[0]
            ) return;
            const cd = setInterval(() => {
                callTimeOver(group, roomNumber);
            },10000)
            if(isGameOver) {
                clearInterval(cd)
            }
        
        return () => clearInterval(cd)
    }, [oppTimeLeft]);

    const claim = async (win: boolean) => {
        
        if (!contract || !group || !roomNumber || !user) return;
        try {
            createLoadingMessage('Claiming tokens ...', "loading");
            const {data} = await getCode(group, roomNumber) as any
            if (win) {
                const claimTxn = await contract.claimTokens(
                    wallet,
                    opponentWallet,
                    BigNumber.from(data)
                    );
                    await claimTxn.wait();
                    setClaimed(true);
                    deleteRoom(group, roomNumber, "game-over");
                    createLoadingMessage('Tokens claimed', "success");
                    reset();
                } else {
                    const withdrawTxn = await contract.withdrawTokens(
                        opponentWallet,
                        BigNumber.from(data)
                    );
                    withdrawTxn.wait();
                    deleteRoom(group, roomNumber, "game-over-draw");
                    createLoadingMessage('Tokens claimed', "success");
                    setClaimed(true);
                    reset();
                }
                } catch (error) {
                    console.error(error);
                    createLoadingMessage('Failed to claim tokens', "fail");
                    setClaimed(false);
                }
                    
                    
                
    };

    const GameOver = (
        <div className="game-over-field">
            {result === "win" ? (
                <>
                    <p className="fs-3">You won!</p>
                    {!claimed && (
                        <button
                            className="button claim--button"
                            onClick={() => claim(true)}
                            >
                            Claim {sumBalances} ETH
                        </button>
                    )}
                </>
            ) : result === "draw" ? (
                <>
                    <p className="fs-4">'It's a TIE :| Next time you will win :)</p>
                    {!claimed &&  (
                        <button
                            className="button claim--button"
                            onClick={() => claim(false)}
                        >
                            Claim {yourBalance} ETH
                        </button>
                    )}
                </>
            ) : result === "loss"? (
                <>
                    <p className="fs-4">You lost :( Next time you will win :)</p>
                </>
            ):
            <>
                <p className="fs-3">Veryfing game result...</p>
            </>
            }
            {(claimed || result === "loss") && (
                <Link to="/" className="fs-3">
                    Return to home 
                </Link>
            )}
        </div>
    );

    const rules = (
        <ul className="rules">
            <li>
                If you take more than 2 minutes to make a move you will lose
            </li>
            <li>
                Game will end in a tie by stalemate, three fold repetition and
                insufficient material
            </li>
            <li>Refreshing may cause a connection loss to the server</li>
        </ul>
    );

    const oppTurnField = (
        <div className="turn-field">
            <p className="fs-3 bold">{formatSeconds(oppTimeLeft)}</p>
            {yourColor !== turn && <p className="fs-3 center-self">Opponents turn</p>}
            <p className="fs-3 bold">{formatSeconds(oppTurnTimer)}</p>
        </div>
    )
    const yourTurnField = (
        <div className="turn-field">
            <p className={`fs-3 bold ${yourTimeLeft < 20 && yourTimeLeft % 2 === 1 && "text-red"}`}>
                        {formatSeconds(yourTimeLeft)}
                    </p>
            {yourColor === turn && <p className="fs-3 center-self">Your turn</p>}
            <p className={`fs-3 bold ${yourTurnTimer < 20 && yourTurnTimer % 2 === 1 && "text-red"}`}>
                        {formatSeconds(yourTurnTimer)}
                    </p>
        </div>
    )

    

    return (
        board[0] &&
        <div className="chess-container">
                {isGameOver && GameOver}
                <div>
                    {!isGameOver && oppTurnField}
                    <div className="board-container">
                        <Board board={board} turn={turn} yourColor={yourColor} />
                    </div>
                    {!isGameOver && yourTurnField}

                </div>
                {rules}
            </div>
    );
}
