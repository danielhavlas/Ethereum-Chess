// import { getRoomsInGroup } from "../../../utils/firebase-utils/firebase.utils";

// export const getOpenRoom = async (group: string, uid: string) => {
//     try{
//       const rooms = await getRoomsInGroup(group)
//       let openRoom = '0'
//       if(rooms === null || rooms === undefined) {
//         return openRoom
//       }

//       const roomsKeys = Object.keys(rooms) as string[]
//       rooms.forEach((room,i) => {
//         const players = room.players.filter(v => v !== undefined)
//         if(room.id0 === uid && room.id1 === uid) return null;
        
//         if(players.length === 1 && parseInt(roomsKeys[i]) <= parseInt(openRoom)){
//             openRoom = roomsKeys[i]
//             return openRoom
//         }
//         else if(players.length === 2 && i + 1 === rooms.length && parseInt(roomsKeys[i]) < parseInt(openRoom)){
//           const id = parseInt(roomsKeys[i].match(/\d/g)?.join('') as string)
//           return (id+1).toString()
//         }
		
//         else{
//           openRoom = rooms.length.toString()
//         }
//       })
//       return openRoom
//     }catch(e){
//     }
//   }

export {}