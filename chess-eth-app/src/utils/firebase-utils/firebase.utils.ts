import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions"
import { getAuth, signInAnonymously, NextOrObserver, User, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import {serverTimestamp, getDatabase, ref, get, onValue, update, onDisconnect } from "firebase/database";
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { wagers } from '../../types/types'

const firebaseConfig = {
    apiKey: "AIzaSyDiX0BmIYFj_BiREPDi5DdaPHtJzsoSqR0",
    authDomain: "chess-eth00.firebaseapp.com",
    databaseURL: "https://chess-eth00-default-rtdb.firebaseio.com",
    projectId: "chess-eth00",
    storageBucket: "chess-eth00.appspot.com",
    messagingSenderId: "518270944277",
    appId: "1:518270944277:web:ba8fcd4a42848662727a1c",
    measurementId: "G-TJ06QLRZM7",
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app)
// connectFunctionsEmulator(functions, "localhost", 5001);


export const auth = getAuth()
export const db = getDatabase();
export const fs = getFirestore()

export const onAuthStateChangedListener = (callback: NextOrObserver<User>) => {
    if(!callback) return;
    onAuthStateChanged(auth,callback)
}

  
export const getRoom = async (group: string, roomNumber: string) => {
    const roomRef = ref(db, `${group}/${roomNumber}`)
    return await get(roomRef).then(snapshot => snapshot.val())
}
export const getRoomsInGroup = async (group: string) => {
    const groupRef = ref(db, group)
    return await get(groupRef).then(snapshot => snapshot.val())
}



export const getWagers = async () => {
    const docRef = doc(fs, 'wagers', 'wagers')
    const docSnap = await getDoc(docRef)
    
    if(docSnap.exists()){
        return docSnap.data() as wagers
    } else {
        return null
    }
}

export const listenForValue = (path: string, callback: any) => {
    if(!callback) return;
    return onValue(ref(db,path), callback) 
}

export const signInGuest = async (wallet: string) => {
    await signInAnonymously(auth).then(userCredential => {
        const user = userCredential.user
        updateProfile(user,{
            displayName: wallet
        })
    })
}


export const signOutUser = async () => {
    await signOut(auth)
}

export const joinRoom = async (group: string, wallet: string) => {
    const joinRoom = httpsCallable(functions, 'joinRoom')
    return await joinRoom({group, wallet})
}

export const setStatus = async (group: string, roomNumber: string, status: string) => {
    const setStatus = httpsCallable(functions, 'setStatus')
    setStatus({group, roomNumber, status})
}

export const validateLock = async (group: string, roomNumber: string, wallet: string, wager: string) => {
    const validateLock = httpsCallable(functions, 'validateLock')
    validateLock({group, roomNumber, wallet, wager})
}

export const move = async (group: string, roomNumber: string, from: string, to: string, piece?: string) => {
    const move = httpsCallable(functions, 'move')
    move({group, roomNumber, from, to, piece})
}

export const getGameOver = async (group: string, roomNumber: string) => {
    const postGameResult = httpsCallable(functions, 'postGameResult')
    return await postGameResult({group, roomNumber})
}
export const callTimeOver = async (group: string, roomNumber: string) => {
    const callTimeOver = httpsCallable(functions, 'callTimeOver')
    return await callTimeOver({group, roomNumber})
}

export const getCode = async (group: string, roomNumber: string,) => {
    const getCode = httpsCallable(functions, 'getCode')
    return await getCode({group, roomNumber})
}

export const deleteRoom = async (group: string, roomNumber: string, reason: string) => {
    const deleteRoom = httpsCallable(functions, 'deleteRoom')
    deleteRoom({group, roomNumber, reason})
}
export const removeUserFromGroup = (group: string, wallet: string) => {
    const removeUserFromGroup = httpsCallable(functions, 'removeUserFromGroup')
    removeUserFromGroup({group, wallet})
}

export const createCustomGame = (group: 'public' | 'private', wager: string, wallet: string, totalGameTime: number) => {
    const createCustomGame = httpsCallable(functions, 'createCustomGame')
    createCustomGame({group, wager, wallet, totalGameTime})
}

export const getCustomGame = async (wallet: string, creatorWallet: string) => {
    const getCustomGame = httpsCallable(functions, 'getCustomGame')
    console.log(wallet, creatorWallet);
    
    return await getCustomGame({wallet, creatorWallet})
}

export const joinCustomGame = (group: 'public' | 'private', wallet: string, creatorWallet: string) => {
    const joinCustomGame = httpsCallable(functions, 'joinCustomGame')
    joinCustomGame({group, wallet, creatorWallet})
}

export const cancelCustomGame = (group: 'public' | 'private', wallet: string) => {
    const cancelCustomGame = httpsCallable(functions, 'cancelCustomGame')
    cancelCustomGame({group, wallet})
}