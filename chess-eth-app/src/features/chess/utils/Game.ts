import { Chess } from 'chess.js'
import { map } from 'rxjs/operators'
import { fromRef, ListenEvent } from "rxfire/database";
import { User } from "firebase/auth";
import { ref, DatabaseReference } from "firebase/database";
import { db, move } from "../../../utils/firebase-utils/firebase.utils";
import { room } from '../../../types/types';

export const chess = new Chess()
export let tempChess = new Chess()
export let gameSubject: any
let gameRef: DatabaseReference

export function getSubject(group: string, roomNumber: string, user: User) {
    gameRef = ref(db, `${group}/${roomNumber}`)
    gameSubject = fromRef(gameRef, ListenEvent.value).pipe(map(change => {
        const {snapshot} = change
        const data = snapshot.val() as room
        if(!data) return;
        
        const {game, ...rest} = data 
        const {gameData} = game
        
        if(gameData !== ''){
            chess.load(gameData)
        }
        tempChess = chess
        return{
            game: {
                board: chess.board(),
                gameData: gameData,
                pendingPromotion: game.pendingPromotion? game.pendingPromotion : null,
                gameOver: game.gameOver,
                winner: game.winner,
                turn: chess.turn(),
                startTime: game.startTime
            },
            ...rest
        }
    }
    ))
 
}


export function initGame(group: string, roomNumber: string, user: User) {
    chess.reset()
    getSubject(group, roomNumber, user)
}

export async function handleMove(group: string, roomNumber: string, from: string, to: string, piece?: string) {
    move(group, roomNumber, from, to, piece)
}

export function inCheck() {
    return chess.inCheck()
}


export function getLegalPositions(){
    return chess.moves({verbose: true})
}
