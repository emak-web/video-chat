import json
from channels.generic.websocket import AsyncWebsocketConsumer


class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = "room_%s" % self.room_name
        self.uid = 0

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name, self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "message", "message": {'type': 'userLeft', 'uid': self.uid}}
        )
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name, self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)

        if text_data_json['type'] == 'login':
            self.uid = text_data_json['uid']
            await self.channel_layer.group_send(
                self.room_group_name, {"type": "message", "message": {'type': 'createOffer', 'uid': self.uid}}
            )
        elif text_data_json['type'] == 'logout':
            await self.channel_layer.group_send(
                self.room_group_name, {"type": "message", "message": {'type': 'userLeft', 'uid': self.uid}}
            )
        else:
            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name, {"type": "message", "message": text_data_json}
            )

    # Receive message from room group
    async def message(self, event):
        message = event["message"]

        # Send message to WebSocket
        await self.send(text_data=json.dumps(message))
