import "./App.css";
import { useRef, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Gradient } from "whatamesh";

import Chess from "./features/chess/Chess";
import Home from "./features/home/Home";
import Loading from "./components/Loading";

function App() {

    const ref = useRef()
    useEffect(() => {
        if(ref.current) {
            const gradient = new Gradient();
            gradient.initGradient("#gradient-canvas");

        }
    }, [ref]);

    return (
        <>
            <canvas id="gradient-canvas" data-transition-in></canvas>
            <div ref={ref} className="App">
                <Loading />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/:group/:room" element={<Chess />} />
                </Routes>
            </div>
        </>
    );
}

export default App;
