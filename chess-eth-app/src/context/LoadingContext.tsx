import React, { useState, createContext } from "react";

type context = {
    message: message;
    createLoadingMessage: (msgIndex: string, type: msgType) => void;
};

type props = {
    children: React.ReactNode;
};

type message = {
    msg: string;
    msgType: msgType;
};

type msgType = "loading" | "fail" | "success";

export const LoadingContext = createContext<context>({} as context);

export const LoadingContextProvider = ({ children }: props) => {
    const [message, setMessage] = useState<message>({} as message);

    const messages = {
        lock: "Locking tokens...",
        join: "Joining room...",
        claim: "Claiming tokens..."
    };
    const successMessages = {   
        lock: "Locked tokens successfuly. Waiting for opponent...",
        claim: "Claimed succesfully",
        join: "Joined room"
    };
    const failMessages = {
        lock: "Failed to lock tokens. Removed from queue",
        claim:"Claim failed, try again.",
        join: "Failed to join room, try again",
        insufficient: "Not enough balance in wallet",
    };

    const createLoadingMessage = (msg: string, msgType: msgType) => {
        const loadingMsg = { msg, msgType };
        setMessage(loadingMsg);
    };

    return (
        <LoadingContext.Provider value={{ message, createLoadingMessage }}>
            {children}
        </LoadingContext.Provider>
    );
};
