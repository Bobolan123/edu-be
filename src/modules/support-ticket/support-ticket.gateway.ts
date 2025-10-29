import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { SupportTicketService } from './support-ticket.service';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  namespace: 'support',
  cors: {
    origin: '*',
  },
})
export class SupportTicketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private onlineUsers: Map<number, string> = new Map();

  constructor(private readonly supportTicketService: SupportTicketService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.findUserIdBySocketId(client.id);
    if (userId) {
      this.onlineUsers.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.onlineUsers.set(data.userId, client.id);
    client.data.userId = data.userId;
    console.log(`User ${data.userId} authenticated with socket ${client.id}`);
    return { success: true };
  }

  @SubscribeMessage('joinTicket')
  handleJoinTicket(
    @MessageBody() data: { ticketId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.ticketId);
    console.log(`Client ${client.id} joined ticket room ${data.ticketId}`);
    return { success: true, ticketId: data.ticketId };
  }

  @SubscribeMessage('leaveTicket')
  handleLeaveTicket(
    @MessageBody() data: { ticketId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.ticketId);
    console.log(`Client ${client.id} left ticket room ${data.ticketId}`);
    return { success: true };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: SendMessageDto & { senderRole: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;

    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const message = await this.supportTicketService.sendMessage(
        { ticketId: data.ticketId, message: data.message },
        userId,
        data.senderRole,
      );

      this.server.to(data.ticketId).emit('newMessage', {
        ticketId: data.ticketId,
        message: message,
      });

      return { success: true, message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { ticketId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    client.to(data.ticketId).emit('userTyping', {
      ticketId: data.ticketId,
      userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('requestOnlineStatus')
  handleOnlineStatus(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const isOnline = this.onlineUsers.has(data.userId);
    return { userId: data.userId, isOnline };
  }

  notifyTicketUpdate(ticketId: string, update: any) {
    this.server.to(ticketId).emit('ticketUpdated', {
      ticketId,
      update,
    });
  }

  private findUserIdBySocketId(socketId: string): number | undefined {
    for (const [userId, sockId] of this.onlineUsers.entries()) {
      if (sockId === socketId) {
        return userId;
      }
    }
    return undefined;
  }
}
