import functions from "firebase-functions";
import { serverTimestamp } from "firebase/database"
import admin from "firebase-admin"
import { ethers } from "ethers";
import cors from 'cors';
import express from "express"
import Provider from '@truffle/hdwallet-provider'
import Web3 from 'web3'
import { Chess } from 'chess.js'

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const abi = require("./contractABI.json");
require('dotenv').config()

const app = express()
app.use(cors({origin: "*"}))
admin.initializeApp()
const db = admin.database()
const fs = admin.firestore()

const address = '0x14efc298F1Daed5824F6B599B556f6d448F5a136'
const privateKey = process.env.PRIVATE_KEY
const rpcURL = process.env.ALCHEMY_URL
const CONTRACT_ADDRESS = '0x2e72b3D884aFD01842C89A86CE1C499dE663d1aB'


export const joinRoom = functions.https.onCall( async (data, context) => {
    try {
        const {group, wallet} = data
        const {uid} = context.auth
        if(!group || !wallet || !uid) return;
        const wagers = await getWagers()
        const wager = group === 'group_1'? wagers.low : group === 'group_2'? wagers.medium : group === 'group_3'? wagers.high : null
        if(!wager) throw new Error("unable to get wagers");
    
        const roomNumber = await getOpenRoom(group, wallet)
        if(roomNumber instanceof Error) throw roomNumber
        if(isNaN(roomNumber)) throw new Error("unable to find room");
        
        const roomRef = db.ref(`${group}/${roomNumber}`)
        const room = await createRoomData(group, roomNumber, uid, wallet, wager)
        if(!room) throw new Error("failed to create room");

        const roomData = await (await roomRef.get()).val()
        if(roomData && roomData.players){
            if(roomData.players.map(p => p.wallet).includes(wallet)) throw new Error("already in room")
            const first = roomData.players.filter(p => p).find(p => p.id !== uid)
            if(roomData.status === 'waiting' && first && first.id !== uid){
                const second = {
                    id: uid,
                    color: first.color === 'w'? 'b':'w',
                    wallet,
                    locked: false,
                    joinedAt: serverTimestamp(),
                    gameTimeLeft: 600000
                }
                const updatedPlayers = [first, second]
                roomRef.update({players: updatedPlayers, status: 'locking'}, (e) => {
                    if(e) return
                    const player0Ref = db.ref(`${group}/${roomNumber}/players/0`)
                    const player1Ref = db.ref(`${group}/${roomNumber}/players/1`)
                    let l = 0
                    let timeout0
                    let timeout1
                    if(!roomData.players[0].locked) {
                        timeout0 = setTimeout( async() => {
                            const player = (await player0Ref.get()).val()
                            if(player.locked) return clearInterval(timeout0)
                            l++
                            player0Ref.remove(async(e) => {
                                if(e) return
                                const room = (await roomRef.get()).val()
                                if(!room.players){
                                    roomRef.remove()
                                } else {
                                    roomRef.update({status: 'waiting'})
                                }
                            })
                        },45000)
                    }
                    if(!roomData.players[1].locked) {
                        timeout1 = setTimeout( async() => {
                            const player = (await player1Ref.get()).val()
                            if(player.locked) return clearInterval(timeout1)
                            l++
                            player1Ref.remove(async (e) => {
                                if(e) return
                                const room = (await roomRef.get()).val()
                                if(!room.players){
                                    roomRef.remove()
                                } else {
                                    roomRef.update({status: 'waiting'})
                                }
                            })
                        },45000)
                    }
                    const playersRef = db.ref(`${group}/${roomNumber}/players`)
                    const listener = playersRef.on('value', snapshot => {
                    const players = snapshot.val()
                    if(players[0] && players[0].locked) {
                        l++
                        if(!timeout0) return
                        clearTimeout(timeout0)
                    }
                    if(players[1] && players[1].locked) {
                        l++
                        if(!timeout1) return
                        clearTimeout(timeout1)
                    }
                    if(l > 1) {
                        playersRef.off('value', listener)
                    }
                } )
                })
            }
        }
        else{
            roomRef.set(room)
        }
        return room.roomNumber
    } catch (error) {
        return console.error(error)
    }
    })
    
    export const setStatus = functions.https.onCall( async (data, context) => {
    try {
        const {group, roomNumber, status} = data
        const {uid} = context.auth
        if(!group || !roomNumber|| !status || !uid) throw new Error("missing data");
        const roomRef = db.ref(`${group}/${roomNumber}`)
        const roomData = (await roomRef.get()).val()
        if(!roomData.players.map(v => v.id).includes(uid)) throw new Error("invalid user");
        
        if(roomData.status === 'onGoing') return;
        if(status === 'onGoing') {
            const gameRef = db.ref(`${group}/${roomNumber}/game`)
            gameRef.update({startTime: serverTimestamp()})
        }
        roomRef.update({status})
        
        
    } catch (error) {
        return console.error(error)
    }
})

export const validateLock = functions.https.onCall(async (data, context) => {

    const {group, roomNumber, wallet, wager} = data
    const {uid} = context.auth
    const provider = new Provider(privateKey, rpcURL)
    const web3 = new Web3(provider)
    const contract = new web3.eth.Contract(abi.abi, CONTRACT_ADDRESS)
    const lockedValue = await contract.methods.lockedTokensOfAddress(wallet).call()
    const wagerInBig = ethers.parseEther((parseFloat(wager) * 0.9).toFixed(4))
    if(BigInt(lockedValue) >= wagerInBig) {
        playerLocked(group, roomNumber, uid)
    }
})

export const move = functions.https.onCall( async (data, context) => {
    try {
        const {group, roomNumber, from, to, piece} = data
        const {uid} = context.auth
        if(!group || !roomNumber || !from || !to) throw new Error("missing data")
        const roomRef = db.ref(`${group}/${roomNumber}`)
        const roomData = (await roomRef.get()).val()
        if(roomData.game.gameOver) throw new Error("game over")
        const player = roomData.players.find(p => p.id === uid)
        if(!player) throw new Error("invalid user");
        const prevFen = roomData.game.gameData != ""? roomData.game.gameData: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        const chess = new Chess()
        chess.load(prevFen)
        if(player.color !== chess.turn()) throw new Error("not your turn")
        const promotions = chess.moves({verbose: true}).filter(m => m.promotion)
        let pendingPromotion
        if(promotions.some(p => `${p.from}:${p.to}`===`${from}:${to}`)) {
            pendingPromotion = {...promotions[0], from, to, color: promotions[0].color }
            updateGame(group, roomNumber,chess, pendingPromotion)
        }
        if(!pendingPromotion || piece){
            let newMove = {from, to}
            if(piece){
                newMove.promotion = piece
            }
            const legalMove = chess.move(newMove)
            if(legalMove) {
                updateGame(group, roomNumber, chess)
                const player0Ref = db.ref(`${group}/${roomNumber}/players/0`)
                const player1Ref = db.ref(`${group}/${roomNumber}/players/1`)
                const player0 = (await player0Ref.get()).val()
                if(player0.id === uid) {
                    const timeUsed = Date.now() - roomData.game.startTime
                    const timeLeft = player0.gameTimeLeft - timeUsed
                    player0Ref.update({gameTimeLeft: timeLeft})
                } else {
                    const player1 = (await player1Ref.get()).val()
                    const timeUsed = Date.now() - roomData.game.startTime
                    const timeLeft = player1.gameTimeLeft - timeUsed
                    player1Ref.update({gameTimeLeft: timeLeft})
                }

                if(chess.isGameOver()){
                    const gameRef = db.ref(`${group}/${roomNumber}/game`)
                    gameRef.update({gameOver: true})
                }
            } else{
                throw new Error("invalid move")
            }
        }
                
    } catch (e) {
        return console.error(e)
    }
})

export const postGameResult = functions.https.onCall( async (data, context) => {
    try {
        const {group, roomNumber} = data
        const {uid} = context.auth
        if(!group || !roomNumber || !uid) throw new Error("missing data")
        const roomRef = db.ref(`${group}/${roomNumber}`)
        const roomData = (await roomRef.get()).val()
        
        const player = roomData.players.find(p => p.id === uid)
        if(!player) throw new Error("invalid user");
        
        const chess = new Chess()
        chess.load(roomData.game.gameData)
        const loser = roomData.players.find(p => p.color === chess.turn())
        const timeUsed = Date.now() - roomData.game.startTime 
        const timeLeft = loser.gameTimeLeft - timeUsed
        const timeOver = roomData.game.startTime + 120000 <= Date.now() || timeLeft <= 0
        const {result , reason} = getGameResult(chess, player, timeOver, roomData.game.winner)
        const winner = roomData.players.find(p => p.color !== chess.turn()).id

        const gameRef = db.ref(`${group}/${roomNumber}/game`)
        
        if(result === 'win') {
            gameRef.update({winner, reason})
        } else if(result === 'draw') {
            gameRef.update({winner: 'draw'})
        } 
    } catch (error) {
        return console.error(error)
    }
})

export const getCode = functions.https.onCall( async(data, context) => {
    const {group, roomNumber} = data
    const {uid} = context.auth
    const roomRef = db.ref(`${group}/${roomNumber}`)
    const roomData = (await roomRef.get()).val()
    if(!roomData.players.map(v => v.id).includes(uid)) throw new Error("invalid user");
    const oppWallet = roomData.players.find(p => p.id != uid).wallet
    const chess = new Chess()
    chess.load(roomData.game.gameData)
    const checkmate = chess.isCheckmate()
    const draw = chess.isDraw()
    const reason = roomData.game.reason
    if(draw) {
        return (await getCodesOfAddress(oppWallet))[1]
    } 
    if(checkmate || reason === 'time-over') {
        const winner = roomData.players.find(p => p.color !== chess.turn()).id
        if(winner === uid) {
            return (await getCodesOfAddress(oppWallet))[0]
        }
    }
})

export const callTimeOver = functions.https.onCall(async(data, context) => {
    try {
        const {group, roomNumber} = data
        const {uid} = context.auth
        if(!group || !roomNumber || !uid) throw new Error("missing data")
        const roomRef = db.ref(`${group}/${roomNumber}`)
        const roomData = (await roomRef.get()).val()
        if(!roomData.players.map(v => v.id).includes(uid)) throw new Error("invalid user");
        const chess = new Chess()
        chess.load(roomData.game.gameData)
        const turnStart = roomData.game.startTime
        const winner = roomData.players.find(p => p.color !== chess.turn()).id
        const loser = roomData.players.find(p => p.color === chess.turn())
        const timeUsed = Date.now() - roomData.game.startTime 
        const timeLeft = loser.gameTimeLeft - timeUsed
        if(turnStart + 120000 <= Date.now() || timeLeft <= 0) {
            const gameRef = db.ref(`${group}/${roomNumber}/game`)
            gameRef.update({gameOver: true, winner })
        }
    } catch (error) {
        return console.error(error)
    }
})

export const deleteRoom = functions.https.onCall( async(data, context) => {
    try {
        const {group, roomNumber, reason} = data
        const {uid} = context.auth
        const roomRef = db.ref(`${group}/${roomNumber}`)
        const roomData = await roomRef.get().then(snapshot => snapshot.val())
        
        if(!roomData.players.map(v => v.id).includes(uid)) throw new Error("invalid user");
        if(reason === 'leave-queue') {
            if(roomData.status === 'waiting') {
                roomRef.remove()
            }
        } 
        else if (reason === 'failed-lock') {
            if(roomData.status === 'locking') {
                const playerRef0 = db.ref(`${group}/${roomNumber}/players/0`)
                const playerRef1 = db.ref(`${group}/${roomNumber}/players/1`)
                const player0 = (await playerRef0.get()).val()
                const player1 = (await playerRef1.get()).val()
                
                if(player0 && player0.id === uid && !player0.locked){
                    roomRef.update({status: 'waiting'})
                    playerRef0.remove(async() => {
                        const room = (await roomRef.get()).val()
                        if(!room.players){
                            roomRef.remove()
                        }
                    })
                    
                }
                else if(player1 && player1.id === uid && !player1.locked){
                    roomRef.update({status: 'waiting'})
                    playerRef1.remove(async () => {
                        const room = (await roomRef.get()).val()
                        if(!room.players){
                            roomRef.remove()
                        }
                    })
                }
            } else {
                if(roomData.players.filter(v => v !== undefined).length < 2) {
                    roomRef.remove()
                    return
                }
    
            }
        }
        else if (reason === 'game-over' && roomData.game.gameOver) {
            roomRef.remove()
        } else if(reason === 'game-over-draw' && roomData.game.gameOver) {
            const playerRef0 = db.ref(`${group}/${roomNumber}/players/0`)
            const playerRef1 = db.ref(`${group}/${roomNumber}/players/1`)
            const player0 = (await playerRef0.get()).val()
            const player1 = (await playerRef1.get()).val()
            
            if(player0 && player0.id === uid){
                playerRef0.remove(async() => {
                    const room = (await roomRef.get()).val()
                    if(!room.players){
                        roomRef.remove()
                    }
                })
            }
            else if(player1 && player1.id === uid){
                playerRef1.remove(async () => {
                    const room = (await roomRef.get()).val()
                    if(!room.players){
                        roomRef.remove()
                    }
                })
            }
        } else if(reason === 'inactive') {
            roomRef.remove()
        }
        
    } catch (error) {
        return console.error(error)
    }
})

export const removeUserFromGroup = functions.https.onCall (async (data, context) => {
    const {group, wallet} = data
    const groupRef = db.ref(`${group}`)
    const groupData = await groupRef.get().then(snapshot => snapshot.val())
    if(!groupData) return
    const room = groupData.find(r => r.players.map( p => p.wallet === wallet))
    if(!room) return
    const roomRef = db.ref(`${group}/${room.roomNumber}`)
    const roomData = await roomRef.get().then(snapshot => snapshot.val())
    if(roomData.status === 'waiting'){
        roomRef.remove()
    }
})

export const createCustomGame = functions.https.onCall((data, context) => {
    const {group, wager, wallet, totalGameTime} = data
    const {uid} = context.auth
    const player = {
        id: uid,
        color: ["w", "b"][Math.floor(Math.random() * 2)],
        wallet: wallet,
        locked: false,
        joinedAt: serverTimestamp(),
        gameTimeLeft: totalGameTime
      }
    const room = {
        status: "waiting",
        players: [player],
        creator: wallet,
        group,
        wager,
        game: {
            gameData: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            pendingPromotion: null,
            startTime: null,
        },
    };

    const roomRef = db.ref(`${group}/${wallet}`)
    roomRef.set(room)
}) 

export const getCustomGame = functions.https.onCall(async (data, context) => {
    const {wallet, creatorWallet} = data
    const roomRef = db.ref(`private/${creatorWallet}`)
    const privateRoom = (await roomRef.get()).val()
    if(privateRoom) {
        if(privateRoom.second && privateRoom.second !== wallet ) return new Error('Room is full')
        roomRef.update({second: wallet})
        return privateRoom
    } else {
        const roomRef = db.ref(`public/${creatorWallet}`)
        const publicRoom = (await roomRef.get()).val()
        if(publicRoom){
            if(publicRoom.second && privateRoom.second !== wallet) return new Error('Room is full')
            roomRef.update({second: wallet})
            return publicRoom
        }
    }
})

export const joinCustomGame = functions.https.onCall( async(data, context) => {
    const {group, wallet, creatorWallet} = data
    const {uid} = context.auth
    const roomRef = db.ref(`${group}/${creatorWallet}`)
    const room = (await roomRef.get()).val()
    const player = {
        id: uid,
        color: ["w", "b"][Math.floor(Math.random() * 2)],
        wallet: wallet,
        locked: false,
        joinedAt: serverTimestamp(),
        gameTimeLeft: room.players[0].gameTimeLeft
    }
    const updatedPlayers = [room.players[0], player]
    roomRef.update({players: updatedPlayers})
})

export const cancelCustomGame = functions.https.onCall(async (data, context) => {
    const {group, wallet} = data
    const roomRef = db.ref(`${group}/${wallet}`)
    const room = (await roomRef.get()).val()
    if(room.status === 'waiting') {
        roomRef.remove()
    }
})

const playerLocked = async (group, roomNumber, uid) => {
    const player0Ref = db.ref(`${group}/${roomNumber}/players/0`)
    const player1Ref = db.ref(`${group}/${roomNumber}/players/1`)
    const player0 = (await player0Ref.get()).val()
    const player1 = (await player1Ref.get()).val()
    if(player0 && player0.id === uid) {
        player0Ref.update({locked: true})
    } else if(player1 && player1.id == uid) {
        player1Ref.update({locked: true})
    }
    
}

const getGameResult =  (chess, player, timeOver, winner) => {
    if(timeOver) {
        const result = player.id === winner? 'win' : 'loss'
        return {result, reason: 'time-over'}
    }
    else if(chess.isCheckmate()){
        const result = chess.turn() === player.color ? 'loss' : 'win'
        const reason = 'checkmate'
        return {result, reason}
    }
    else if(chess.isDraw()){
        const result = 'draw'
        let reason = '50 moves rule'
        if(chess.isStalemate()){
            reason = 'stalemate'
        }
        else if(chess.isThreefoldRepetition()){
            reason = 'repetition'
        }
        else if(chess.isInsufficientMaterial()){
            reason = 'insufficient material'
        }
        return {result, reason}
    } 
}

const updateGame = async (group, roomNumber, chess, pendingPromotion) => {
    const gameRef = db.ref(`${group}/${roomNumber}/game`)
    const updatedData = { gameData: chess.fen(), pendingPromotion: pendingPromotion || null, startTime: serverTimestamp() }
    await gameRef.update(updatedData)
}

const getCodesOfAddress = async (wallet) => {
    const provider = new Provider(privateKey, rpcURL)
    const web3 = new Web3(provider)
    const contract = new web3.eth.Contract(abi.abi, CONTRACT_ADDRESS)
    const codes = await contract.methods.getCodes(wallet).call({from: address})
    return codes
}

export const getOpenRoom = async (group, wallet) => {
    const inRoom = await checkIfInRoom(wallet)
    if(inRoom) return new Error("already in room in another group")
    const rooms = await getRoomsInGroup(group)
    if(!rooms) return 0
    const room = rooms.filter(r => r && r.players).find(r => {
        if(r.players.filter(p => p)[0].joinedAt + 900000 < Date.now() && r.status === 'waiting' && r.players.filter(p => p).length !== 2) {
            const roomRef = db.ref(`${r.group}/${r.roomNumber}`)
            roomRef.remove()
            return true
        }   
        return r.status === 'waiting' && r.players.filter(p => p).length !== 2
    })
    if(room) {
        return parseInt(room.roomNumber)
    } else {
        return rooms.length
    }
}

export const getRoomsInGroup = async (group)  => {
  const ref = db.ref(group);
  return await ref.get().then((snapshot) => {
      if (snapshot.exists()) {
          const rooms = snapshot.val()
          return rooms
      }
  })
}

export const createRoomData = async (
  group,
  roomNumber,
  uid,
  wallet,
  wager
) => {
  if (!uid || !group || !wallet || isNaN(roomNumber) || !wager) return;
  const player = {
      id: uid,
      color: ["w", "b"][Math.floor(Math.random() * 2)],
      wallet: wallet,
      locked: false,
      joinedAt: serverTimestamp(),
      gameTimeLeft: 600000
    }
    const room = {
      status: "waiting",
      players: [player],
      roomNumber,
      group,
      wager,
      game: {
          gameData: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          pendingPromotion: null,
          startTime: null,
      },
  };


  return room
}


const checkIfInRoom = async (wallet) => {
    const group1 = await getRoomsInGroup('group_1')
    const group2 = await getRoomsInGroup('group_2')
    const group3 = await getRoomsInGroup('group_3')
    const allRooms = [...(group1 ?? []), ...(group2 ?? []), ...(group3 ?? [])]
    if(allRooms.length === 0) return false; 

    const room = allRooms.filter(r => r && r.players).find(r => {
        const players = r.players.filter(p => p)
        return players.some(p => p.wallet === wallet)
    })
    if(!room) return false;
    if(room.status !== 'waiting') return true
    const playerRef = db.ref(`${room.group}/${room.roomNumber}`)
    playerRef.remove()
    return false


} 

export const getWagers = async () => {
    const docRef = fs.doc('wagers/wagers')
    return await docRef.get().then(snapshot => {
        if(snapshot.exists){
            return snapshot.data()
        } else {
            return null
        }
    })
}



          