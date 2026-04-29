import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Product, InventoryTransaction

class InventoryConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'inventory_updates'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        await self.handle_transaction(data)

    async def inventory_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'inventory_update',
            'product': event['product'],
            'transaction': event['transaction']
        }))

    @database_sync_to_async
    def handle_transaction(self, data):
        product = Product.objects.get(id=data['product_id'])
        transaction = InventoryTransaction.objects.create(
            product=product,
            transaction_type=data['type'],
            quantity=data['quantity'],
            reason=data['reason'],
            user_id=self.scope['user'].id
        )
        
        if data['type'] == 'IN':
            product.quantity += data['quantity']
        elif data['type'] == 'OUT':
            product.quantity -= data['quantity']
        else:
            product.quantity += data['quantity']
        
        product.save()
        
        self.notify_update(product, transaction)

    def notify_update(self, product, transaction):
        self.channel_layer.group_send({
            'type': 'inventory_update',
            'product': {
                'id': product.id,
                'name': product.name,
                'quantity': product.quantity,
                'sku': product.sku
            },
            'transaction': {
                'id': transaction.id,
                'type': transaction.transaction_type,
                'quantity': transaction.quantity
            }
        })