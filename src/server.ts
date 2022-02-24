import * as socketio from 'socket.io'

interface Player {
    id: string
    name: string
    color: string
    x: number
    z: number
    thetaY: number
}

interface Room {
    id: string
    password: string
    players: Player[]
}

interface JoinData {
    roomId: string
    playerName: string
    password: string
    color: string
    roomPassword: string
}
interface MoveData {
    x: number
    z: number
    thetaY: number
}

const ENABLE_LOG = false

const logger = (...args: any[]) => {
    ENABLE_LOG && console.log(...args)
}

class SheepServer {
    io: socketio.Server
    rooms: Room[] = []
    constructor(io: socketio.Server) {
        this.io = io

        this.io.on('connection', this.handleConnection.bind(this))
    }

    handleConnection(socket: socketio.Socket) {
        socket.join('lobby')
        socket.on('join', this.handleJoin(socket).bind(this))
        socket.on('disconnect', this.handleDisconnect(socket).bind(this))
        socket.on('leave', this.handleDisconnect(socket).bind(this))
        socket.on('move', this.handleMove(socket).bind(this))
    }
    handleJoin(socket: socketio.Socket) {
        return ({ roomId, roomPassword, playerName, color }: JoinData) => {
            // sanitize roomId and trim to max length 64

            // if no roomId
            if (!roomId) {
                logger(`${playerName} joined lobby`)
                logger(`Error: No roomId provided`)
                socket.emit('error', 'No roomId provided')
                return
            }
            if (!playerName) {
                logger(`${playerName} joined lobby`)
                logger(`Error: No playerName provided`)
                socket.emit('error', 'No playerName provided')
                return
            }
            if (!color) {
                logger(`${playerName} joined lobby`)
                logger(`Error: No color provided`)
                socket.emit('error', 'No color provided')
                return
            }
            roomPassword = roomPassword ?? ''

            const sanitizedRoomId = roomId
                .replace(/[^a-zA-Z0-9]/g, '')
                .substring(0, 64)
            const sanitizedPlayerName = playerName
                .replace(/[^a-zA-Z0-9]/g, '')
                .substring(0, 64)
            const sanitizedColor = color.replace(/[^#a-f0-9]/g, '')

            // if sanitized roomId is empty, reply with error
            if (sanitizedRoomId.length === 0) {
                logger(`${playerName} joined lobby`)
                logger(`Error: Invalid roomId`)
                socket.emit('error', 'Invalid room id')
                return
            }

            const player: Player = {
                name: sanitizedPlayerName,
                color: sanitizedColor,
                id: socket.id,
                x: 0,
                z: 0,
                thetaY: 0,
            }

            const roomExists = this.findRoom(sanitizedRoomId)

            // if player is already in room, reply with error
            if (roomExists) {
                const room = roomExists
                const playerInRoom = room.players.find(
                    (p) => p.id === socket.id
                )
                if (playerInRoom) {
                    logger(`${playerName} joined lobby`)
                    logger(`Error: Player already in room`)
                    socket.emit('error', 'Player already in room')
                    return
                }
            }

            if (!roomExists && this.rooms.length < 10) {
                logger(`${playerName} created room ${sanitizedRoomId}`)
                const room = {
                    id: sanitizedRoomId,
                    password: roomPassword,
                    players: [player],
                }
                this.rooms.push(room)
                socket.emit('joined', {
                    room: {
                        ...room,
                        roomPassword: '',
                    },
                    player,
                })
            } else if (!roomExists) {
                logger(`${playerName} joined lobby`)
                logger(`Error: Too many rooms`)
                socket.emit('error', 'Too many rooms')
                return
            } else if (roomExists) {
                // check password
                if (roomExists.password === roomPassword) {
                    this.addPlayerToRoom(player, roomExists)

                    // notify other players in room
                    socket.to(sanitizedRoomId).emit('playerJoined', { player })
                } else {
                    logger(`${playerName} joined lobby`)
                    logger(`Error: Wrong password`)
                    socket.emit('error', 'Incorrect password')
                    return
                }
            }

            socket.leave('lobby')
            logger(`${playerName} joined room ${sanitizedRoomId}`)
            socket.join(sanitizedRoomId)
            socket.emit('joined', {
                room: {
                    ...roomExists,
                    roomPassword: '',
                },
                player,
            })
        }
    }
    handleDisconnect(socket: socketio.Socket) {
        return () => {
            logger(`${socket.id} disconnected`)
            const room = this.findRoomWithPlayer(socket.id)
            if (room) {
                const player = this.findPlayerInRoom(socket.id, room)
                if (player) {
                    this.removePlayerFromRoom(socket.id, room)
                    socket.to(room.id).emit('playerLeft', { player })
                }
            }
        }
    }

    handleMove(socket: socketio.Socket) {
        return ({ x, z, thetaY }: MoveData) => {
            logger(
                `${socket.id} moved to ${x.toFixed(2)}, ${z.toFixed(
                    2
                )}, ${thetaY.toFixed(2)}`
            )
            // find room
            const room = this.findRoomWithPlayer(socket.id)
            if (room) {
                const player = this.findPlayerInRoom(socket.id, room)
                if (player) {
                    player.x = x
                    player.z = z
                    player.thetaY = thetaY

                    // notify other players in room
                    socket
                        .to(room.id)
                        .emit('playerMoved', { x, z, thetaY, player })
                }
            }
        }
    }

    findRoom(roomId: string) {
        return this.rooms.find((room) => room.id === roomId)
    }

    findRoomWithPlayer(playerId: string) {
        return this.rooms.find((room) =>
            room.players.find((player) => player.id === playerId)
        )
    }
    findPlayerInRoom(playerId: string, room: Room) {
        return room.players.find((player) => player.id === playerId)
    }

    removePlayerFromRoom(playerId: string, room: Room) {
        room.players = room.players.filter((player) => player.id !== playerId)
    }

    addPlayerToRoom(player: Player, room: Room) {
        room.players.push(player)
    }
}

export default SheepServer
