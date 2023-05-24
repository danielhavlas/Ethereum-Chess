import { useState, useContext, useEffect } from "react";

import { LoadingContext } from "../context/LoadingContext";

type msgType = {
    msgIndex: number;
    success: "loading" | "fail" | "success";
};

function Loading() {
    const { message } = useContext(LoadingContext);

    const [show, setShow] = useState(false);

    if (message.msgType === "success" || message.msgType === "fail") {
        setTimeout(() => {
            setShow(false);
        }, 3000);
    }

    useEffect(() => {
        if (message.msg != null) {
            setShow(true);
        }
    }, [message]);

    return (
        <div>
            <div
                className={
                    show ? "message message--show" : "message message--hide"
                }
            >
                <p>{message.msg}</p>
                {message.msgType === "loading" && (
                    <i className="loader --7"></i>
                )}
            </div>
        </div>
    );
}

export default Loading;
