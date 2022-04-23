//.push()添加至末尾 .pop()删除末尾 .unshift()添加至开头 .splice()切片
//mouelMessage[路径，长，宽，高，X，Y，Z]
export var modelsMessage = []
export var characterMessage = {}
export var characterMessage2 = []
export var npcCharacterMessage = {}

//非建筑物体

//二级跳出的三个物体先放入地下
modelsMessage.push('/static/models/jumpObject/book.glb', 0.5, 0.5, 0.5, 5, -5, -5)
modelsMessage.push('/static/models/jumpObject/pen.glb', 0.3, 0.3, 0.3, 5, -5, -5)
modelsMessage.push('/static/models/jumpObject/star.glb', 0.5, 0.5, 0.5, 5, -5, -6)

//云朵
modelsMessage.push('/static/models/cloud/cloud_3/scene.gltf', 3, 3, 3, 20, 50, 20)
modelsMessage.push('/static/models/cloud/cloud_2/scene.gltf', 3, 3, 3, -20, 50, -6)
modelsMessage.push('/static/models/cloud/cloud_1/scene.gltf', 3, 3, 3, 15, 50, 40)

//主建筑物体
modelsMessage.push('/static/models/building/base.glb', 9, 9, 9, 0, 0, 0)
modelsMessage.push('/static/models/building/EEE.glb', 9, 9, 9, 0, 0, 0)
modelsMessage.push('/static/models/building/FB.glb', 9, 9, 9, 0, 0, 0)
modelsMessage.push('/static/models/building/guild.glb', 9, 9, 9, 0, 0, 0)
modelsMessage.push('/static/models/building/victoria.glb', 9, 9, 9, 0, -0.3, 0)
modelsMessage.push('/static/models/building/rail.glb', 9, 9, 9, 0, 0, 0)
modelsMessage.push('/static/models/building/service.glb', 9, 9, 9, 0, 0, 0)
modelsMessage.push('/static/models/building/square.glb', 9, 9, 9, 0, 0, 0)

//道路上的物体
modelsMessage.push('/static/models/roadObject/Meseum_Stand_up_Sign.glb',3,3,3,13,9.8,-18)
modelsMessage.push('/static/models/roadObject/Meseum_Stand_up_Sign.glb',3,3,3,8,9.8,-18)
modelsMessage.push('/static/models/roadObject/Meseum_Stand_up_Sign.glb',3,3,3,3,9.8,-18)
modelsMessage.push('/static/models/roadObject/EEE_North_Campus_Map.glb',1.6,1.6,1.6,18,9,-25)
//红绿灯
modelsMessage.push('/static/models/roadObject/Traffic_Light.glb',1,1,1,29,11,8)
modelsMessage.push('/static/models/roadObject/Traffic_Light.glb',1,1,1,13.5,11,-10)
modelsMessage.push('/static/models/roadObject/Traffic_Light.glb',1,1,1,-4.5,11,19)
modelsMessage.push('/static/models/roadObject/Traffic_Light.glb',1,1,1,-19,11,27)

modelsMessage.push('/static/models/roadObject/Road_sign.glb',0.3,0.3,0.3,5.6,9,-11)
modelsMessage.push('/static/models/roadObject/Stone_bench.glb',4,4,4,47,6.5,21)
modelsMessage.push('/static/models/roadObject/rubbish_bin.glb',0.3,0.3,0.3,18,7.3,-18)
modelsMessage.push('/static/models/roadObject/QR_Scanning_Hub.glb',1,1,1,10,6.7,16)
modelsMessage.push('/static/models/roadObject/black_pillar.glb',0.6,0.6,0.6,1,5.6,11)
//路灯
modelsMessage.push('/static/models/roadObject/light1.glb',1,1,1,53,6,10)
modelsMessage.push('/static/models/roadObject/light2.glb',1,1,1,53,6,-10)
modelsMessage.push('/static/models/roadObject/light1.glb',1,1,1,26,6,10)
modelsMessage.push('/static/models/roadObject/light2.glb',1,1,1,26,6,-10)
modelsMessage.push('/static/models/roadObject/light1.glb',1,1,1,-30,6,10)
modelsMessage.push('/static/models/roadObject/light2.glb',1,1,1,-30,6,-10)
modelsMessage.push('/static/models/roadObject/light2.glb',1,1,1,-60,6,-10)
modelsMessage.push('/static/models/roadObject/light2.glb',1,1,1,-90,6,-10)
modelsMessage.push('/static/models/roadObject/light2.glb',1,1,1,-120,6,-10)


characterMessage['cow'] = '/static/models/character/Cow.gltf'
characterMessage['pug'] = '/static/models/character/Pug.gltf'

npcCharacterMessage['cow'] = '/static/models/character/Cow.gltf'
npcCharacterMessage['pug'] = '/static/models/character/Pug.gltf'   
