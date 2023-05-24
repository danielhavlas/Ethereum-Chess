import React, {
    useState,
    createContext,
    SetStateAction,
    Dispatch,
} from "react";

type context = {
    reset: () => void;
    group: string | null;
    roomNumber: string | null;
    yourColor: string | null;
    gameOver: gameOver | null;
    wallet: string | null;
    wager: string | null;
    opponentWallet: string | null;
    gameCode: number | null;
    lockingStatus: lockState;
    inQueue: boolean;
    gameOngoing: boolean;
    calledMatchFound: boolean;
    setGroup: Dispatch<SetStateAction<string | null>>;
    setRoomNumber: Dispatch<SetStateAction<string | null>>;
    setYourColor: Dispatch<SetStateAction<string | null>>;
    setGameOver: Dispatch<SetStateAction<gameOver | null>>;
    setWallet: Dispatch<SetStateAction<string | null>>;
    setWager: Dispatch<SetStateAction<string | null>>;
    setOpponentWallet: Dispatch<SetStateAction<string | null>>;
    setGameCode: Dispatch<SetStateAction<number | null>>;
    setLockingStatus: Dispatch<SetStateAction<lockState>>;
    setInQueue: Dispatch<SetStateAction<boolean>>;
    setGameOngoing: Dispatch<SetStateAction<boolean>>;
    setCalledMatchFound: Dispatch<SetStateAction<boolean>>;
};

type gameOver = {
    result: string;
    reason: string;
};

type props = {
    children: React.ReactNode;
};

type lockState = "not-locking" | "locking" | "locked";

export const RoomContext = createContext<context>({} as context);

export const RoomContextProvider = ({ children }: props) => {
    const [group, setGroup] = useState<string | null>(null);
    const [roomNumber, setRoomNumber] = useState<string | null>(null);
    const [yourColor, setYourColor] = useState<string | null>(null);
    const [gameOver, setGameOver] = useState<gameOver | null>(null);
    const [wallet, setWallet] = useState<string | null>(null);
    const [wager, setWager] = useState<string | null>(null);
    const [opponentWallet, setOpponentWallet] = useState<string | null>(null);
    const [gameCode, setGameCode] = useState<number | null>(null);
    const [lockingStatus, setLockingStatus] =
        useState<lockState>("not-locking");
    const [inQueue, setInQueue] = useState(false);
    const [gameOngoing, setGameOngoing] = useState(false);
    const [calledMatchFound, setCalledMatchFound] = useState(false);

    const reset = () => {
        setGroup(null);
        setRoomNumber(null);
        setGameCode(null);
        setInQueue(false);
        setGameOngoing(false);
        setCalledMatchFound(false);
        setLockingStatus("not-locking");
    };

    return (
        <RoomContext.Provider
            value={{
                reset,
                roomNumber,
                setRoomNumber,
                group,
                setGroup,
                yourColor,
                setYourColor,
                gameOver,
                setGameOver,
                wallet,
                setWallet,
                wager,
                setWager,
                opponentWallet,
                setOpponentWallet,
                gameCode,
                setGameCode,
                lockingStatus,
                setLockingStatus,
                inQueue,
                setInQueue,
                gameOngoing,
                setGameOngoing,
                calledMatchFound,
                setCalledMatchFound,
            }}
        >
            {children}
        </RoomContext.Provider>
    );
};
