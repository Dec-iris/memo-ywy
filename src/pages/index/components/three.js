import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import Stats from 'stats.js'
import { io } from 'socket.io-client'
//引入模型数据
import { modelsMessage, characterMessage, npcCharacterMessage } from './modelMessage'
//引入摇杆工具
import nipplejs from 'nipplejs'
import { updateWhether } from './sceneEffects'
import { makeNameLabel } from './makeLabelCanvas'

export function start() {
  //加载完模型后第一次进行场景刷新等活动
  function afterLoadModels() {
    if (!IsPC() && joystickMove) {
      addJoystick()
    }
    //初始化NPC
    initNPC()
    book = modelsGroup.getObjectByName('11000')
    pencil = modelsGroup.getObjectByName('11001')
    star = modelsGroup.getObjectByName('11002')
    //将物体立起来
    //book.rotateX(Math.PI * 0.5)
    star.rotateX(Math.PI * 0.5)
    pencil.rotateX(Math.PI * 0.1)
    //将被检测物体存入
    objectForClick()

    //获取环境信息
    let sunPosition = new THREE.Vector3()
    let intensity = 1.5
    let sunColor = new THREE.Color()
    let enviColor = new THREE.Color()
    let skyColor = new THREE.Color()
    let a = updateWhether(sunPosition, intensity, sunColor, enviColor, skyColor, scene)
    sunLight.position.copy(a[0])
    sunLight.intensity = a[1]
    hemisphereLight.intensity = a[1]
    sunLight.color = a[2]
    hemisphereLight.color = a[3]
    renderer.setClearColor(a[4])   
    //增加名字标签
    makeNameLabel(mainObject, socket.id, 2.7)
    //加载完毕后再进行第一次刷新页面
    animate()
    //隐藏原始云朵
    modelsGroup.getObjectByName('11003').visible = false
    modelsGroup.getObjectByName('11004').visible = false
    modelsGroup.getObjectByName('11005').visible = false

    //第一次与服务器握手
    newClient()
  }

  let fwdValue = null
  let bkdValue = null
  let rgtValue = null
  let lftValue = null
  var joystickMove = 1
  let joyManager
  function addJoystick() {
    const options = {
      zone: document.getElementById('joystickWrapper1'),
      size: 140,
      multitouch: true,
      maxNumberOfNipples: 2,
      mode: 'static',
      restJoystick: true,
      shape: 'circle',
      //position: { top: 100, left: 600 },
      position: { bottom: '100px', right: '100px' },
      dynamicPage: true,
    }

    joyManager = nipplejs.create(options)

    joyManager['0'].on('move', function (evt, data) {
      //关闭自由视角移动
      pointMoveLock = 0
      
      const forward = data.vector.y
      const turn = data.vector.x

      if (forward > 0) {
        fwdValue = Math.abs(forward)
        bkdValue = 0
      } else if (forward < 0) {
        fwdValue = 0
        bkdValue = Math.abs(forward)
      }

      if (turn > 0) {
        lftValue = 0
        rgtValue = Math.abs(turn)
      } else if (turn < 0) {
        lftValue = Math.abs(turn)
        rgtValue = 0
      }
    })

    joyManager['0'].on('end', function (evt) {
      bkdValue = null
      fwdValue = null
      lftValue = null
      rgtValue = null
    })
  }

  //判断用户使用设备
  function IsPC() {
    var userAgentInfo = navigator.userAgent
    var Agents = ['Android', 'iPhone', 'SymbianOS', 'Windows Phone', 'iPad', 'iPod']
    var flag = true
    for (var v = 0; v < Agents.length; v++) {
      if (userAgentInfo.indexOf(Agents[v]) > 0) {
        flag = false
        break
      }
    }
    return flag
  }

  //连接多用户,一行代码就可生效
  const socket = io()
  //存储当前在线人数
  var NOC = 1
  //存储所有的在线用户模型
  var clientsGroup = new THREE.Group()
  clientsGroup.name = 'clientsGroup'

  //存储客户端位置,方向，角色字典
  var positionDic = {}
  var rotationDic = {}
  var characterDic = {}
  //第一次连入服务器，发送初始化信息，回调所有客户端信息
  function newClient() {
    socket.emit(
      'newClient',
      mainObject.position,
      mainObject.quaternion,
      mainCharacter,
      (response) => {
        positionDic = response.positionDic,
        rotationDic = response.rotationDic,
        characterDic = response.characterDic
        //更新地图中所有用户的位置
        firstClientsCreat()
      },
    )
  }
  //监听是否有新用户接入，更新词典
  socket.on('addClient', (id, position, rotation, character) => {
    //在场景中添加新用户
    newClientCreat(id, position, rotation, character)
    positionDic[id] = position
    rotationDic[id] = rotation
    characterDic[id] = character
  })
  //监听是否有其他用户发生移动
  socket.on('otherClientMove', (id, position, rotation) => {
    updateClient(id, position, rotation)
    //获取存储所有用户位置的词典
    positionDic[id] = position
    rotationDic[id] = rotation
  })
  //监听是否有其他用户停止移动
  socket.on('stopClientMove',(id)=>{
    stopClientMove(id)
  })
  //监听是否有用户失去连接
  socket.on('clientDisconnect', id => {
    //删除用户位置信息
    deleteClient(id)
    delete positionDic[id]
    delete rotationDic[id]
    delete characterDic[id]
  })

  //第一次加载所有的用户模型
  function firstClientsCreat() {
    //创建所有角色
    for (var key in positionDic) {
      //判断是不是主物体
      if (socket.id != key) {
        let a = characterDic[key]
        let position = positionDic[key]
        //利用四元数来旋转物体
        let rotation = rotationDic[key]
        let newObject = cloneGltf(characterGroup.getObjectByName(a))
        newObject.scene.name = key
        newObject.scene.position.setX(position.x)
        newObject.scene.position.setY(position.y - 0.7)
        newObject.scene.position.setZ(position.z)
        newObject.scene.quaternion.set(rotation._x, rotation._y, rotation._z, rotation._w)
        //增加名字标签
        makeNameLabel(newObject.scene, key, 3.1)
        clientsGroup.add(newObject.scene)
      }
    }
  }
  //创建新用户
  function newClientCreat(id, position, rotation, character) {
    let a = character
    let position1 = position
    let rotation1 = rotation
    let newObject = cloneGltf(characterGroup.getObjectByName(a))
    newObject.scene.name = id
    newObject.scene.position.setX(position1.x)
    newObject.scene.position.setY(position1.y - 0.7)
    newObject.scene.position.setZ(position1.z)
    newObject.scene.quaternion.set(rotation1._x, rotation1._y, rotation1._z, rotation1._w)
    //增加名字标签
    makeNameLabel(newObject.scene, id, 3.1)
    clientsGroup.add(newObject.scene)
  }
  //更新用户位置移动
  function updateClient(id, position, rotation) {
    //加载模型完成之后再进行位置更新
    if (clientsGroup.getObjectByName(id)) {
      npcStandAnimateGroup.remove(clientsGroup.getObjectByName(id))
      npcRunAnimateGroup.remove(clientsGroup.getObjectByName(id))
      npcRunAnimateGroup.add(clientsGroup.getObjectByName(id))
      clientsGroup.getObjectByName(id).position.setX(position.x)
      clientsGroup.getObjectByName(id).position.setY(position.y - 0.7)
      clientsGroup.getObjectByName(id).position.setZ(position.z)
      clientsGroup
        .getObjectByName(id)
        .quaternion.set(rotation._x, rotation._y, rotation._z, rotation._w)
    }
  }
  //删除失去连接的用户
  function deleteClient(id) {
    //做一次模型加载判断
    if (clientsGroup.getObjectByName(id)) {
      clientsGroup.remove(clientsGroup.getObjectByName(id))
    }
  }
  //用户产生移动后将数据传给服务器
  function clientMove() {
    //将用户的移动信息发送给服务器
    socket.emit('clientMove', mainObject.position, mainObject.quaternion)
    //更新自己部分的字典
    positionDic[socket.id] = mainObject.position
    rotationDic[socket.id] = mainObject.quaternion
  }
  //发送信息给服务器用户停止移动
  function stopMove(){
    socket.emit('stopMove')
  }
  //关闭其他用户的移动动作
  function stopClientMove(id){
    //做一次模型加载判断
    if (clientsGroup.getObjectByName(id)) {
        npcRunAnimateGroup.remove(clientsGroup.getObjectByName(id))
        npcStandAnimateGroup.remove(clientsGroup.getObjectByName(id))
        npcStandAnimateGroup.add(clientsGroup.getObjectByName(id))
    }
  }

  //初始化对象
  var gui,
    canvas,
    fog,
    scene,
    sizes,
    hemisphereLight,
    sunLight,
    sunLight2,
    sunLightPosition,
    renderer,
    controls,
    camera,
    cameraRaycaster,
    manager,
    isPC
  init()
  function init() {
    // Debug
    //  gui = new dat.GUI()
    //  gui.show(deltaTime)

    //判断用户使用设备
    isPC = IsPC()

    //资源加载检查
    manager = new THREE.LoadingManager()

    // Canvas
    canvas = document.querySelector('canvas.webgl')
    //Fog
    fog = new THREE.Fog('rgb(135,205,235)', 1, 100)
    // Scene
    scene = new THREE.Scene()
    //scene.fog = fog

    //页面大小
    sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    //半球反射光，增加真实度
    hemisphereLight = new THREE.HemisphereLight('rgb(255,255,255)', 'rgb(150,150,150)', 1)
    scene.add(hemisphereLight)

    //路灯
    const light = new THREE.PointLight('rgb(255,97,3)', 2, 20)
    light.position.set(-0.5, 9, -1.4)
    light.castShadow = true
    //scene.add( light );

    //Directional light 直射太阳光
    sunLight = new THREE.DirectionalLight('rgb(255,255,255)', 2)
    //为了现实效果，太阳光的X轴取值应该为（-50，50）
    sunLightPosition = new THREE.Vector3(50, 40, 20)

    sunLight.position.copy(sunLightPosition)
    sunLight.castShadow = true
    //调整直射太阳光的范围参数
    sunLight.shadow.camera = new THREE.OrthographicCamera();
    sunLight.shadow.camera.near = 0
    sunLight.shadow.camera.far = 300
    sunLight.shadow.camera.left = -100
    sunLight.shadow.camera.right = 100
    sunLight.shadow.camera.top = 80
    sunLight.shadow.camera.bottom = -80
    //调整阴影质量，数越大阴影质量越好
    sunLight.shadow.mapSize = new THREE.Vector2(2048, 2048)
    //删除光照阴影导致的条纹，需要随着光照数据而改变
    sunLight.shadow.bias = -0.0016
    //灯光辅助线
    // const helper = new THREE.DirectionalLightHelper( sunLight);
    // scene.add( helper );
    scene.add(sunLight)

    //渲染器
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
    })
    renderer.setSize(sizes.width, sizes.height)
    //限制像素渲染值
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    //天空背景颜色
    renderer.setClearColor('rgb(135,205,235)')
    //导入的模型颜色矫正
    renderer.outputEncoding = THREE.sRGBEncoding
    //shadows 阴影
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    sunLight.castShadow = true

    // Main camera 主物体摄像机
    camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.01, 500)
    camera.position.set(0, 0, 0)
    //camera.lookAt( scene.position );
    scene.add(camera)

    //Controls 环绕视角控制
    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    //控制摄像机保持在水平面以上
    controls.maxPolarAngle = Math.PI * 0.5

    cameraRaycaster = new THREE.Raycaster()
    let currentIntersect = null
  }

  //获取屏幕刷新数据在左上角
  // var stats = new Stats();
  // stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  // document.body.appendChild(stats.dom);

  //获取书笔和收藏模型
  let book = new THREE.Object3D()
  let pencil = new THREE.Object3D()
  let star = new THREE.Object3D()
  //检测资源加载过程
  manager.onProgress = function (url, itemsLoaded, itemsTotal) {
    // console.log( 'Started loading file: ' + url + '.\nLoaded '  + itemsLoaded + ' of ' + itemsTotal + ' files.' );
  }
  //检测资源加载完毕后运行
  manager.onLoad = function () {
    afterLoadModels()
  }

  //clone 带皮骨骼对象需要特殊的clone方法
  function cloneGltf(gltf) {
    const clone = {
      animations: gltf.animations,
      scene: gltf.scene.clone(true),
    }

    const skinnedMeshes = {}

    gltf.scene.traverse(node => {
      if (node.isSkinnedMesh) {
        skinnedMeshes[node.name] = node
      }
    })

    const cloneBones = {}
    const cloneSkinnedMeshes = {}

    clone.scene.traverse(node => {
      if (node.isBone) {
        cloneBones[node.name] = node
      }

      if (node.isSkinnedMesh) {
        cloneSkinnedMeshes[node.name] = node
      }
    })

    for (let name in skinnedMeshes) {
      const skinnedMesh = skinnedMeshes[name]
      const skeleton = skinnedMesh.skeleton
      const cloneSkinnedMesh = cloneSkinnedMeshes[name]

      const orderedCloneBones = []

      for (let i = 0; i < skeleton.bones.length; ++i) {
        const cloneBone = cloneBones[skeleton.bones[i].name]
        orderedCloneBones.push(cloneBone)
      }

      cloneSkinnedMesh.bind(
        new THREE.Skeleton(orderedCloneBones, skeleton.boneInverses),
        cloneSkinnedMesh.matrixWorld,
      )
    }

    let clone2 = new THREE.Object3D()
    clone2.scene = clone.scene
    clone2.animations = clone.animations
    return clone2
  }
  //模型加载器
  const gltfLoader = new GLTFLoader(manager)
  const fbxLoader = new FBXLoader()
  //加载模型文件
  //modelsGroup储存模型对象，需要注意里面还有一层scene对象
  var modelsGroup = new THREE.Group()
  var characterGroup = new THREE.Group()
  var npcGroup = new THREE.Group()
  modelsGroup.name = 'modelsGroup'
  characterGroup.name = 'characterGroup'

  //加载模型数据
  loadModels(modelsMessage)
  loadCharacters(characterMessage)
  function loadModels(modelsMessage) {
    const numbers = modelsMessage.length / 7
    for (var i = 0; i < numbers; i++) {
      const x = i * 7
      gltfLoader.load(
        //存贮位置信息
        modelsMessage[0 + x],
        gltf => {
          //大小信息与坐标信息
          gltf.scene.scale.set(modelsMessage[1 + x], modelsMessage[2 + x], modelsMessage[3 + x])
          gltf.scene.position.x = modelsMessage[4 + x]
          gltf.scene.position.y = modelsMessage[5 + x]
          gltf.scene.position.z = modelsMessage[6 + x]
          //为每个对象进行命名编号，注意只能用字符串类型
          gltf.scene.name = x / 7 + 11000 + ''
          //只能为mesh对象添加阴影，将gltf再展开一层
          gltf.scene.traverse(function (node) {
            if (node.isMesh) {
              node.castShadow = true
              node.receiveShadow = true
            }
          })
          modelsGroup.add(gltf.scene)
        },
      )
    }
  }
  function loadCharacters(characterMessage) {
    for (var key in characterMessage) {
      //three.js 的加载器的顺序有问题，需要重新跟踪一下坐标！！！！！！
      //这一步很关键
      const x = key
      gltfLoader.load(characterMessage[x], object => {
        object.scene.traverse(function (child) {
          if (child.isMesh) {
            //材质
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        let newObject = cloneGltf(object)
        newObject.name = x
        characterGroup.add(newObject)
      })
    }
  }

  let staffEEE = null
  let staffFB = null
  let staffVic = null
  let staffSer = null
  let staffMid = null
  creatNPC()
  function creatNPC() {
    gltfLoader.load(npcCharacterMessage['pug'], object => {
      object.scene.traverse(function (child) {
        if (child.isMesh) {
          //材质
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      object.scene.name = 'memo-server'
      object.scene.position.set(15, 10, -3)
      staffEEE = cloneGltf(object)
      staffFB = cloneGltf(object)
      staffMid = cloneGltf(object)
      staffSer = cloneGltf(object)
      staffVic = cloneGltf(object)
    })
  }
   //创建动画组
  let npcStandAnimateGroup = new THREE.AnimationObjectGroup()
  let npcSayHiAnimateGroup = new THREE.AnimationObjectGroup()
  let npcRunAnimateGroup = new THREE.AnimationObjectGroup()
  //创建动画混合器
  let npcMixer1 = null
  let npcMixer2 = null
  let npcMixer3 = null
  //创建动画
  let npcStandAnimate = null
  let npcMoveAnimate = null
  let npcRunAnimate = null
  function initNPC() {
    staffVic.scene.name = 'staffVic'
    makeNameLabel(staffVic.scene, 'VIC',3.1)
    staffEEE.scene.name = 'staffEEE'
    makeNameLabel(staffEEE.scene, 'EEE',3.1)
    staffSer.scene.name = 'staffSer'
    makeNameLabel(staffSer.scene, 'AB',3.1)
    staffMid.scene.name = 'staffMid'
    makeNameLabel(staffMid.scene, 'UQ',3.1)
    staffFB.scene.name = 'staffFB'
    makeNameLabel(staffFB.scene, 'FB',3.1)
    staffEEE.scene.rotateY(-1.3)
    staffSer.scene.rotateY(-1.8)
    staffMid.scene.rotateY(3)
    staffFB.scene.rotateY(2)
    staffVic.scene.rotateY(0.8)
    staffVic.scene.position.set(-1.6, 6.5, -13.2)
    staffEEE.scene.position.set(16, 6.5, -32)
    staffSer.scene.position.set(67.6, 6.5, 31.5)
    staffMid.scene.position.set(15.8, 5.5, 33)
    staffFB.scene.position.set(-33, 6.5, 16)
    //放入动画组
    npcStandAnimateGroup.add(staffVic.scene, staffEEE.scene, staffSer.scene, staffMid.scene, staffFB.scene)
    npcMixer1 = new THREE.AnimationMixer(npcStandAnimateGroup)
    npcMixer2 = new THREE.AnimationMixer(npcSayHiAnimateGroup)
    npcMixer3 = new THREE.AnimationMixer(npcRunAnimateGroup)
    //加载动画
    npcStandAnimate = npcMixer1.clipAction(staffEEE.animations[2])
    npcMoveAnimate = npcMixer2.clipAction(staffEEE.animations[14])
    npcRunAnimate = npcMixer3.clipAction(staffEEE.animations[8])
    npcGroup.add(staffVic.scene, staffEEE.scene, staffSer.scene, staffMid.scene, staffFB.scene)
  }
  scene.add(modelsGroup)
  scene.add(clientsGroup)
  scene.add(npcGroup)

  //随机生成主人物角色
  function getRandomIntInclusive(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min //含最大值，含最小值
  }
  var characterNumber = getRandomIntInclusive(0, 1)
  var mainCharacter = Object.keys(characterMessage)[characterNumber]
  let mixer = null
  let walkAction = null
  let runAction = null
  let stayAction = null
  var mainObject = null
  var coronaSafetyDistance = 6
  var follow = new THREE.Object3D()
  //随机选取一个人物角色
  gltfLoader.load(characterMessage[mainCharacter], object => {
    mixer = new THREE.AnimationMixer(object.scene)
    walkAction = mixer.clipAction(object.animations[15])
    runAction = mixer.clipAction(object.animations[8])
    stayAction = mixer.clipAction(object.animations[2])
    object.scene.traverse(function (child) {
      if (child.isMesh) {
        //材质
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    //为了能够改变主物体位置要放在mainObject的里面，不能直接赋值
    //数值可能会引起人物跳动，暂未完美解决问题
    object.scene.position.y = -0.6
    mainObject.add(object.scene)
  })

  mainObject = new THREE.Object3D()
  mainObject.position.set(50, 7.5, 15)
  mainObject.scale.set(1, 1, 1)
  mainObject.name = 'mainObject'
  //产生阴影
  mainObject.castShadow = true
  follow.position.z = -coronaSafetyDistance
  follow.position.y = 1.5
  mainObject.add(follow)
  //主物体的起始位置
  mainObject.rotateY(-2)
  modelsGroup.add(mainObject)

  //监听屏幕变化
  const mouse = new THREE.Vector2()
  //1是转动视角事件，2是点击导航事件，
  var eventSwitch = 0
  //用来控制新一轮的导航事件
  var clickMoveLock = 0
  //控制点击导航事件
  var pointMoveLock = 0
  //控制拖拽导航事件 一开始锁定防止视角冲突
  var freeDragLock = 1
  //抹除鼠标微小移动带来的操作模糊
  var tempX = 0
  var tempY = 0
  //存储下一次移动距离
  var nextDistance = 0
  const keys = { a: false, s: false, d: false, w: false }
  //只需要调用一次，在刷新里不需要调用
  windowChange()
  function windowChange() {
    //监听调整屏幕大小
    window.addEventListener('resize', () => {
      // Update sizes
      sizes.width = window.innerWidth
      sizes.height = window.innerHeight
      // Update camera
      camera.aspect = sizes.width / sizes.height
      camera.updateProjectionMatrix()
      // Update renderer
      renderer.setSize(sizes.width, sizes.height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    })

    //监听键盘输入
    window.addEventListener('keydown', function (e) {
      pointMoveLock = 0
      const key = e.code.replace('Key', '').toLowerCase()
      if (keys[key] !== undefined) keys[key] = true
    })
    window.addEventListener('keyup', function (e) {
      const key = e.code.replace('Key', '').toLowerCase()
      if (keys[key] !== undefined) keys[key] = false
    })

    //判断是否是pc，避免安卓同时触发两种事件监听
    if (isPC) {
      //监听鼠标移动, 定位鼠标
      window.addEventListener('mousemove', event => {
        mouse.x = (event.clientX / sizes.width) * 2 - 1
        mouse.y = -(event.clientY / sizes.height) * 2 + 1
        //鼠标移动的模糊值，过滤掉细小的鼠标移动
        tempX = (tempX - mouse.x * 1000) * (tempX - mouse.x * 1000)
        tempY = (tempY - mouse.y * 1000) * (tempY - mouse.y * 1000)
        if (freeDragLock == 0 && tempX + tempY >= 20) {
          pointMoveLock = 1
          eventSwitch = 1
          //停止跑动动作
          stopMove()
          walkAction.stop()
          runAction.stop()
          stayAction.play()
        }
        tempX = mouse.x * 1000
        tempY = mouse.y * 1000
      })

      //监听鼠标拖动和点击事件
      window.addEventListener('mousedown', event => {
        pointMoveLock = 0
        freeDragLock = 0
      })

      window.addEventListener('mouseup', () => {
        freeDragLock = 1
        if (pointMoveLock == 0 && currentIntersect) {
          jumpObjects()
          eventSwitch = 2
          //确保每次点击都能获得新的导航点
          clickMoveLock = 0
          currentIntersect = null
          //初始化移动距离防止被碰撞检测抵消
          nextDistance = 0
        }
      })
    }
  }
  //移动端事件监听
  touchChange()
  function touchChange() {
    //关闭摇杆控制后启用点击移动控制
    if (!joystickMove) {
      //ios系统需要特殊优化一下 “event.touches[0].pageX ”
      window.addEventListener('touchstart', event => {
        //获取触摸点，以便进行碰撞检测
        mouse.x = (event.touches[0].pageX / sizes.width) * 2 - 1
        mouse.y = -(event.touches[0].pageY / sizes.height) * 2 + 1
        pointMoveLock = 0
        freeDragLock = 0
      })
      window.addEventListener('touchend', () => {
        freeDragLock = 1
        if (pointMoveLock == 0 && currentIntersect) {
          jumpObjects()
          eventSwitch = 2
          //确保每次点击都能获得新的导航点
          clickMoveLock = 0
          currentIntersect = null
          //初始化移动距离防止被碰撞检测抵消
          nextDistance = 0
        }
      })
      window.addEventListener('touchmove', event => {
        //鼠标移动的模糊值，过滤掉细小的鼠标移动
        tempX = (tempX - mouse.x * 1000) * (tempX - mouse.x * 1000)
        tempY = (tempY - mouse.y * 1000) * (tempY - mouse.y * 1000)
        if (freeDragLock == 0 && tempX + tempY >= 1) {
          pointMoveLock = 1
          eventSwitch = 1
        }
        tempX = mouse.x * 1000
        tempY = mouse.y * 1000
      })
    } else {
      window.addEventListener('touchstart', event => {
        //获取触摸点，以便进行碰撞检测
        mouse.x = (event.touches[0].pageX / sizes.width) * 2 - 1
        mouse.y = -(event.touches[0].pageY / sizes.height) * 2 + 1
        //默认开启视角自由移动
        pointMoveLock = 1
      })
      window.addEventListener('touchend', event => {
        jumpObjects()
      })
    }
  }

  //检测碰撞, 初始化检测点
  var intersectSurfaceBottom = null
  var intersectSurfaceFront = null
  var intersectSurfaceBack = null
  var intersectSurfaceDistance = null
  var intersectsWithObject = null
  // 顶点三维向量
  const vertices = []
  //包围圈，要略大于主物体，否则会检测到主物体
  const temp = 0.55
  //声明不同的检测点坐标
  vertices.push(new THREE.Vector3(temp, temp, temp))
  vertices.push(new THREE.Vector3(-temp, temp, temp))
  vertices.push(new THREE.Vector3(-temp, temp, -temp))
  vertices.push(new THREE.Vector3(temp, temp, -temp))
  vertices.push(new THREE.Vector3(0, 0, temp))
  vertices.push(new THREE.Vector3(0, -temp, 0))
  vertices.push(new THREE.Vector3(0, 0, -temp))
  //先声明射线减少性能消耗  
  let collisionRaycaster = new THREE.Raycaster()
  function onIntersect() {
    // 物体中心点坐标
    const centerCoord = mainObject.position.clone()
    //性能优先只检测前面和下面两条射线
    //先创建前和下两条检测线
    for (let i = 4; i < 6; i++) {
        // 获取世界坐标下的检测点坐标
        let vertexWorldCoord = vertices[i].clone().applyMatrix4(mainObject.matrixWorld)
        // 获得由中心指向顶点的向量
        var dir = vertexWorldCoord.clone().sub(centerCoord)
        // 发射光线 centerCoord 为投射的原点向量  dir 向射线提供方向的方向向量
        collisionRaycaster.set(centerCoord, dir.normalize())
        // 放入要检测的 物体cube2，返回相交物体
        intersectsWithObject = collisionRaycaster.intersectObjects(objectsToTest, true)
        // 检测是哪个面发生了碰撞
        if (intersectsWithObject.length > 0) {
            if (intersectsWithObject[0].distance < 2 * temp) {
                if (i == 5) {
                    intersectSurfaceBottom = 1
                    intersectSurfaceDistance = intersectsWithObject[0].distance
                } else if (i == 4) {
                    intersectSurfaceFront = 1
                } else if (i == 6) {
                    intersectSurfaceBack = 1
                }
            }
        }
    }
    //检测前后往返四条线
    // for (let i = 0; i < 4; i++) {
    //   //数学方法获得第二点坐标索引
    //   var a = null
    //   if (i % 2 == 0) {
    //     a = i + 1
    //   } else {
    //     a = i - 1
    //   }
    //   // 获取世界坐标下 网格变换后的 两个点坐标
    //   let vertexWorldCoord1 = vertices[i].clone().applyMatrix4(mainObject.matrixWorld)
    //   let vertexWorldCoord2 = vertices[a].clone().applyMatrix4(mainObject.matrixWorld)
    //   // 获得由这个检测点指向下一个检测点的向量
    //   var dir = vertexWorldCoord2.clone().sub(vertexWorldCoord1)
    //   // 发射光线 第一个检测点 为投射的原点向量  dir 向射线提供方向的方向向量
    //   let raycaster = new THREE.Raycaster(vertexWorldCoord1, dir.normalize())
    //   // 放入要检测的 物体cube2，返回相交物体
    //   intersectsWithObject = raycaster.intersectObjects(objectsToTest, true)
    //   // 检测是哪个面发生了碰撞 0，1是前面 2，3是后面
    //   if (intersectsWithObject.length > 0) {
    //     if (intersectsWithObject[0].distance < temp * 2) {
    //       if ((i == 0) | (i == 1)) {
    //         intersectSurfaceFront = 1
    //       } else {
    //         intersectSurfaceBack = 1
    //       }
    //     }
    //   }
    // }
  }

  //控制主物体移动，让太阳光跟随移动刷新以节约性能
  var dir = new THREE.Vector3()
  var temp0 = new THREE.Vector3()
  var temp1 = new THREE.Vector3()
  var temp2 = new THREE.Vector3()
  var temp3 = new THREE.Vector3()
  //鼠标点击事件持续运行
  var angle = null
  var angleDirection = 1
  var distance = null
  //区分上一次移动事件是否中途停止
  var moveTrigger = 0
  var velocity = 0.0
  //根据帧率来控制移动速度
  var moveSpeed = 0.0
  var speed = 0.0
  //控制总移动开关
  var stopMainObjectMove = 0
  function mainObjectMove() {
    //第三人称控制移动，相机距离位置很重要
    speed = 0
    //点击鼠标移动物体，判断条件分别是触发信号， 是否获得目标点信号
    if ((eventSwitch == 2) | (clickMoveLock == 1)) {
      //通过标记clickMoveLock来完成持续刷新动作
      //同时通过判断currentIntersect来防止移动设备的识别错误
      if (clickMoveLock != 1 && currentIntersect) {
            //将主物体移动到点击位置
            let dir1 = new THREE.Vector3(0, 0, 1)
            let vertexWorldCoord = dir1.clone().applyMatrix4(mainObject.matrixWorld)
            //获得由中心指向前方的向量
            var originPoint = vertexWorldCoord.clone().sub(mainObject.position)
            //将所有导航点设置到与物体同一高度处，减少距离误差
            var horizontalPoint = currentIntersect.point.setY(mainObject.position.y)
            var targetPoint = horizontalPoint.clone().sub(mainObject.position)
            //获得旋转角和移动距离，同时让物体保留一段距离
            angle = originPoint.angleTo(targetPoint)
            distance = originPoint.distanceTo(targetPoint) - 0.5
            //保存移动距离防止被碰撞检测抵消
            nextDistance = distance
            //使用两个向量叉乘来确定旋转角方向
            let direction = originPoint.cross(targetPoint)
            if (direction.y < 0) {
                angleDirection = -1
            } else {
                angleDirection = 1
            }
            //标记第一遍后运行持续距离改变
            clickMoveLock = 1
      } else if (clickMoveLock == 1) {
        //发生碰撞时清空点导航目标
        if (intersectSurfaceFront == 1) {
          distance = 0
          moveTrigger = 1
        }
        if (angle > 0) {
          //每次刷新旋转一定角度
          mainObject.rotateY(moveSpeed * angleDirection)
          angle -= moveSpeed
        } else if (distance > 0) {
          //每次刷新前进一定距离
          mainObject.translateZ(moveSpeed)
          distance -= moveSpeed
        } else if (intersectSurfaceFront == 0 && moveTrigger == 1) {
          //碰撞后将下一次移动距离赋值
          distance = nextDistance
          moveTrigger = 0
        } else {
          clickMoveLock = 0
          //这里要将开关重置，否则会一直是5
          eventSwitch = 0
        }
      }
    }

    //键盘控制 和 摇杆控制 和 动画控制
    var turn = 0
    if (keys.w && intersectSurfaceFront != 1) speed = moveSpeed
    //掉头的时候向左转掉头
    if (keys.s && intersectSurfaceBack != 1 && !keys.a && !keys.d) {
      mainObject.rotateY(0.05)
      speed = moveSpeed / 5
    }
    if (fwdValue >= 0.2 && intersectSurfaceFront != 1) speed = moveSpeed * fwdValue
    mainObject.translateZ(speed)

    if (keys.a) {
      mainObject.rotateY(0.03)
      turn = 1
    }
    if (keys.d) {
      mainObject.rotateY(-0.03)
      turn = 1
    }
    if (lftValue >= 0.2) {
      mainObject.rotateY(0.03 * lftValue)
      turn = 1
    }
    if (rgtValue >= 0.2) {
      mainObject.rotateY(-0.03 * rgtValue)
      turn = 1
    }

    //在这里判断移动状态和播放用户动画
    if (speed > 0 || clickMoveLock == 1) {
      clientMove()
      walkAction.stop()
      runAction.play()
  } else if (turn == 1) {
      clientMove()
      walkAction.play()
  } else {
      stopMove()
      walkAction.stop()
      runAction.stop()
      stayAction.play()
  }

    //上斜面，通过模糊高度变化来控制上行高度
    if (intersectSurfaceBottom == 1) {
      mainObject.position.y = 0.6 - intersectSurfaceDistance + mainObject.position.y
    } else if (intersectSurfaceBottom != 1) {
      mainObject.position.y = mainObject.position.y - 0.1
    }

    //a是主物体的渐进物体，用来控制物体移动时镜头速度
    temp1.copy(mainObject.position)
    //镜头的观察点上移，同时匹配自由视角转变
    temp1.setY(2)
    temp2.lerp(temp1, 0.8)
    temp3.copy(camera.position)
    let cAndMDistance = temp1.distanceTo(temp3)
    //如果摄像机距离和物体太近就启用视角限制转移，否则就用视角自由转移
    if (cAndMDistance <= coronaSafetyDistance) {
      dir.copy(temp2).sub(temp3).normalize()
      const dis = temp2.distanceTo(temp3) - coronaSafetyDistance
      camera.position.addScaledVector(dir, dis)
    }
    //视角自由转移速度
    var turnSpeed = moveSpeed / 3
    camera.position.lerp(temp0, turnSpeed)
    temp0.setFromMatrixPosition(follow.matrixWorld)
  }

  //控制跳出开关
  var triggerToJumpSwitch = 0
  var fatherObject = null
  let initPosition = new THREE.Vector3(0, -10, 0)
  //确定物体跳出的位置
  var point1 = new THREE.Vector3(0, 3.7, 0)
  var point2 = new THREE.Vector3(1, 3.7, 0)
  var point3 = new THREE.Vector3(-1, 3.7, 0)
  function triggerToJump() {
    book.position.copy(initPosition)
    pencil.position.copy(initPosition)
    star.position.copy(initPosition)
    for (var item in objectPoint) {
      let temp = modelsGroup.getObjectByName(item)
      let dis = mainObject.position.distanceTo(temp.position)
      //控制跳出的距离
      if (dis <= 4.5) {
        let point11 = point1.clone().applyMatrix4(mainObject.matrixWorld)
        let point22 = point2.clone().applyMatrix4(mainObject.matrixWorld)
        let point33 = point3.clone().applyMatrix4(mainObject.matrixWorld)
        book.position.copy(point11)
        pencil.position.copy(point22)
        star.position.copy(point33)
        fatherObject = item
      }
    }
    for (var item in npcPoint) {
      npcStandAnimateGroup.remove(npcGroup.getObjectByName(item))
      npcSayHiAnimateGroup.remove(npcGroup.getObjectByName(item))
      npcStandAnimateGroup.add(npcGroup.getObjectByName(item))
      let temp = npcGroup.getObjectByName(item)
      let dis = mainObject.position.distanceTo(temp.position)
      //控制跳出的距离
      if (dis <= 4.5) {
          //将对象存储进动作控制器中
          npcStandAnimateGroup.remove(npcGroup.getObjectByName(item))
          npcSayHiAnimateGroup.remove(npcGroup.getObjectByName(item))
          npcSayHiAnimateGroup.add(npcGroup.getObjectByName(item))
          let point11 = point1.clone().applyMatrix4(temp.matrixWorld)
          let point22 = point2.clone().applyMatrix4(temp.matrixWorld)
          let point33 = point3.clone().applyMatrix4(temp.matrixWorld)
          book.position.copy(point11)
          pencil.position.copy(point22)
          star.position.copy(point33)
          fatherObject = item
      }
    }
  }
  //点击物体，走近物体时跳出选项
  function jumpObjects() {
    //获取被点击的主物体
    let temp = currentIntersect.object.parent.name + ''
    //发送点击事件
    uni.$emit('clickObject', temp, fatherObject)
    console.log(fatherObject);
  }

  //获取允许被点击的对象集
  var objectsToTest = null
  //放入被检测物体的位置
  var objectPoint = {}
  var npcPoint = {}
  function objectForClick() {
    //在这里加入允许产生碰撞交互
    let numberOfModels = modelsGroup.children.length
    objectsToTest = []
    //注意人物模型也在组里，所以需要减一
    for(var i = 0; i < numberOfModels - 1; i++){
        let name = 11000 + i + ''
        objectsToTest.push(modelsGroup.getObjectByName(name))
    }
    //主人物弹出二级物体(全部物体都加进去)
    for(var i = 0; i < numberOfModels - 1; i++){
        let name = 11000 + i + ''
        objectPoint[name] = modelsGroup.getObjectByName(name).position
    }

    //NPC弹出二级物体
    npcPoint['staffVic'] = npcGroup.getObjectByName('staffVic').position
    npcPoint['staffEEE'] = npcGroup.getObjectByName('staffEEE').position
    npcPoint['staffSer'] = npcGroup.getObjectByName('staffSer').position
    npcPoint['staffMid'] = npcGroup.getObjectByName('staffMid').position
    npcPoint['staffFB'] = npcGroup.getObjectByName('staffFB').position
  }

  //控制第一次创建云朵
  var initCloud = 1
  var cloudGroup = new THREE.Group()
  function cloudcloudcloud() {
    //第一次运行创建云朵
    if (initCloud) {
      for (let x = 0; x < 30; x++) {
        let name = (x % 3) + 11003 + ''
        let cloud = modelsGroup.getObjectByName(name).clone()
        //云朵随机位置与大小
        let x_position = getRandomIntInclusive(-300, 300)
        let z_position = getRandomIntInclusive(-300, 300)
        let y_position = getRandomIntInclusive(60, 80)
        let scaleNum = getRandomIntInclusive(5, 15)
        cloud.scale.set(scaleNum, scaleNum, scaleNum)
        cloud.position.set(x_position, y_position, z_position)
        cloudGroup.add(cloud)
      }
      initCloud = 0
    }
    //随后每帧都会更新位置
    for (let x = 0; x < 30; x++) {
      if (cloudGroup.children[x].position.x > -200) {
        cloudGroup.children[x].translateX(-0.02)
      } else {
        cloudGroup.children[x].position.setX(200)
      }
    }
    scene.add(cloudGroup)
  }

  let currentIntersect = null
  const clock = new THREE.Clock()
  let previousTime = 0
  //刷新屏幕动画
  function animate() {
    //播放npc动画
    npcStandAnimate.play()
    npcMoveAnimate.play()
    npcRunAnimate.play()

    cloudcloudcloud()
    //检测是否靠近触发跳出
    triggerToJump()
    //获得帧率
    const elapsedTime = clock.getElapsedTime()
    let deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime
    let FPS = 1 / deltaTime
    //根据帧率来控制物体移动速度
    moveSpeed = 150 / (FPS * 20)

    // 更新动画
    mixer.update(deltaTime);
    npcMixer1.update(deltaTime)
    npcMixer2.update(deltaTime)
    npcMixer3.update(deltaTime)

    //旋转跳出的三个物体
    book.rotateY(-0.01)
    pencil.rotateY(0.01)
    star.rotateZ(0.01)

    //初始化trigger
    intersectSurfaceBack = 0
    intersectSurfaceBottom = 0
    intersectSurfaceFront = 0

    //初始化射线方向
    cameraRaycaster.setFromCamera(mouse, camera)

    var intersectsModels = cameraRaycaster.intersectObjects(objectsToTest, true)
    var intersectsClients = cameraRaycaster.intersectObjects(clientsGroup.children, true)

    //存放相交的第一个物体，先检测被点击对象是否是其他用户，在检测是否是固定物体
    if (intersectsClients.length) {
      currentIntersect = intersectsClients[0]
    } else if (intersectsModels.length) {
      currentIntersect = intersectsModels[0]
    } else {
      currentIntersect = null
    }

    //使用trigger来决定物体的视角移动方式
    if (pointMoveLock == 0 && stopMainObjectMove == 0) {
      onIntersect()
      mainObjectMove()
    }

    //每帧都要更新镜头控制
    let tempMainObject = mainObject.position.clone()
    tempMainObject.add(new THREE.Vector3(0, 2, 0))
    controls.target = tempMainObject
    controls.update()

    //stats.update()
    // Render
    renderer.render(scene, camera)
    // Call animate again on the next frame
    window.requestAnimationFrame(animate)
  }

  uni.$on('stopMove', ()=>{
    stopMainObjectMove = 1
  })
  uni.$on('startMove', ()=>{
    pointMoveLock = 1
    stopMainObjectMove = 0
  })
}

export {}
