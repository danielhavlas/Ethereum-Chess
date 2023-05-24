import { useState, useContext, useEffect } from 'react'
import {ethers, BigNumber} from 'ethers'
import { LoadingContext } from '../../../context/LoadingContext'
import { RoomContext } from '../../../context/RoomContext';
import { ContractContext } from '../../../context/ContractContext';
import { cancelCustomGame, createCustomGame, getCustomGame, getRoomsInGroup, joinCustomGame, listenForValue, setStatus } from '../../../utils/firebase-utils/firebase.utils';
import { DataSnapshot } from 'firebase/database';
import { room } from '../../../types/types';
import { log } from 'firebase-functions/logger';


export function CustomGame(props: any) {
    const [create, setCreate] = useState(false)
    const [join, setJoin] = useState(false)

    const back = () => {
        setJoin(false)
        setCreate(false)
    }


    return ( 
        <div>
           {!create && !join &&
               <>
                    <button onClick={props.showCustomGame}>Back</button>
                    <button onClick={() => setCreate(true)}>Create game</button>
                    <button onClick={() => setJoin(true)}>Join game</button>
                </> }
            {create && !join && <CreateGame back={back} />}

            {join && !create && <JoinGame back={back} />}

        </div>
    );
}

function JoinGame ({back}: {back: () => void}) {

    
    const {wallet, wager, setWager, setGroup, setRoomNumber, setInQueue} = useContext(RoomContext);
        

    const [joinAddress, setJoinAddress] = useState('')
    const [gameWager, setGameWager] = useState('')
    const [gameTotalGameTime, setGameTotalGameTime] = useState(0)
    const [gameCreator, setGameCreator] = useState('')
    const [gameGroup, setGameGroup] = useState<'public' | 'private'>()

    const [allPublicRooms, setAllPublicRooms] = useState<room[]>()


    const getGame = async() => {
        if(!joinAddress || !wallet) return
        const {data} = await getCustomGame(wallet ,joinAddress) as any
        setGameWager(data.wager)
        setGameTotalGameTime(data.gameTime)
        setGameCreator(data.creator)
        setGameGroup(data.group)
    }

    const joinGame = () => {
        console.log(gameGroup, wallet, gameCreator);
        if(!wallet || !gameCreator || !gameGroup) return;
        
        joinCustomGame(gameGroup, wallet, gameCreator)
        setWager(gameWager)
        setGroup(gameGroup)
        setRoomNumber(gameCreator)
        setInQueue(true)

    }

    useEffect(() => {
        getRoomsInGroup('public').then( data => {console.log(data);
         setAllPublicRooms(Object.values(data))} )
    }, []);

    const joinPublicRoom = async (address: string | undefined) => {
        if(!address || !wallet) return;
        const {data} = await getCustomGame(wallet , address) as any
        console.log(data);
        
        setGameWager(data.wager)
        setGameTotalGameTime(data.players[0].gameTimeLeft)
        setGameCreator(data.creator)
        setGameGroup(data.group)
    }

    const publicRooms =  allPublicRooms?.map((room, i) => (
            <tr key={i}>
                <td>{room.creator}</td>
                <td>{room.wager}</td>
                <td>{room.players[0].gameTimeLeft / 60000}m</td>
                <button onClick={() => joinPublicRoom(room.creator)}>Join Game</button>
            </tr>
    ))
        

    const table = (
        <table>
            <thead>
                <th>Creator</th>
                <th>Wager</th>
                <th>Game time</th>
            </thead>
            <tbody>
                {publicRooms}
            </tbody>
        </table>
    )

    return ( 
        !gameCreator? <div>
                    <button onClick={back}>Back</button>
                    <div className="flex">
                        <p>Opponents address:</p>
                        <input type="text" value={joinAddress} onChange={e => setJoinAddress(e.target.value)} />
                    </div>
                    <button onClick={getGame}>Join Game</button>
                    <br />
                    {table}
                </div> :
                <div>
                    <p>Creator: {gameCreator}</p>
                    <p>Wager: {gameWager}</p>
                    <p>Game time: {gameTotalGameTime}</p>
                    <button onClick={joinGame}>Join Game</button>
                </div> )
}

function CreateGame({back}: {back: () => void}) {

    const { contract } = useContext(ContractContext);
    const {wallet, wager, setWager, setGroup, setRoomNumber, setInQueue, reset} = useContext(RoomContext);
    const { createLoadingMessage } = useContext(LoadingContext);
    
    const [customWager, setCustomWager] = useState('')
    const [customTotalGameTime, setCustomTotalGameTime] = useState(0)
    const [visibility, setVisibility] = useState<'private' | 'public'>('private')
    
    const [gameWager, setGameWager] = useState('')
    const [gameTotalGameTime, setGameTotalGameTime] = useState(0)
    const [gameCreator, setGameCreator] = useState('')
    const [gameGroup, setGameGroup] = useState('')
    const [second, setSecond] = useState('')




    const createGame = async () => {
        if(!window.ethereum || !wallet || !contract || !customTotalGameTime || !customWager) return;
        const provider = new ethers.providers.Web3Provider(window.ethereum as any);
        const balance = await provider.getBalance(wallet) as BigNumber;
        const lockedTokens = await contract.lockedTokensOfAddress(wallet) as BigNumber;
        if (balance.add(lockedTokens).lt(ethers.utils.parseEther(customWager))) {
            reset()
            return createLoadingMessage("Not enough balance in wallet", "fail");
        }
        createLoadingMessage('Creating room ...','loading')
        createCustomGame(visibility, customWager, wallet, customTotalGameTime)
        setGameCreator(wallet)
        setGameWager(customWager)
        setGameTotalGameTime(customTotalGameTime)
        listenForValue(`${visibility}/${wallet}`, async (snapshot: DataSnapshot) => {
            const room = snapshot.val()
            if(room.second){
                setSecond(room.second)
            }
        })
    }

    const startGame = () => {
        if(!wallet || !visibility) return
        setStatus(visibility, wallet, 'locking')
        setWager(gameWager)
        setGroup(visibility)
        setRoomNumber(gameCreator)
        setInQueue(true)
    }

    const cancel = () => {
        if(!wallet) return
        cancelCustomGame(visibility, wallet)
    }


    return ( !gameCreator ? <div>
        <button onClick={back}>Back</button>
        <div className='flex'>
            <p>Select bet amount</p>
            <div className='input'>
                <input type="number" value={customWager} onChange={e => setCustomWager(e.target.value)} />
                <p>ETH</p>
            </div>
        </div>
        <div className='flex'>
            <p>Select total game time</p>
            <button onClick={() => setCustomTotalGameTime(300000)}>5 min</button>
            <button onClick={() => setCustomTotalGameTime(600000)}>10 min</button>
            <button onClick={() => setCustomTotalGameTime(1800000)}>30 min</button>
        </div>
        <div className='flex'>
            <button onClick={() => setVisibility('private')}>Private</button>
            <button onClick={() => setVisibility('public')}>Public</button>
        </div>
        <div className='flex'>
            <p>Invite code:</p>
            <p>{wallet}</p>
        </div>
        <p>Send your opponent your wallet address</p>
        <button onClick={createGame}>Create game</button>
    </div>
     :
    <div>
        {second? second : 'Waiting for opponent...'}
        <p>Wager: {gameWager}</p>
        <p>Game time: {gameTotalGameTime}</p>
        {second ? 
        <button onClick={startGame}>Start Game</button> :
        <button onClick={cancel}>Cancel Game</button>
        }
    </div>  );
}


