import * as THREE from 'three'

let sunColorStore = []
let enviColorStore = []
let skyColorStore = []
//夜晚，白天，傍晚
sunColorStore[2] = 'rgb(255,255,255)'
sunColorStore[4] = 'rgb(255,140,0)'
sunColorStore[5] = 'rgb(245,245,220)'

enviColorStore[2] = 'rgb(255,255,255)' 
enviColorStore[4] = 'rgb(255,127,80)' 
enviColorStore[5] = 'rgb(255,248,220)'

skyColorStore[2] = 'rgb(135,206,235)'
skyColorStore[4] = 'rgb(255,127,80)'
skyColorStore[5] = 'rgb(10,10,30)'
//根据当地时间来调整环境变量
export function updateWhether(sunPosition, intensity, sunColor, enviColor, skyColor, scene){
    var a = []
    let date = new Date()
    let hours = date.getHours()
    //日升日落时间
    let sunUp = 6
    let sunDown = 21
    let testTime = hours
    if( sunUp <= testTime && testTime <= sunDown){
        let x_position = Math.round(50 - ((testTime - sunUp)/(sunDown-sunUp))*100)
        intensity = intensity - Math.abs((sunDown + sunUp)/2 - testTime) * (intensity/((sunDown+sunUp)/4))
        sunPosition.set(x_position, 40, 20)
        intensity = intensity + 0.2
    }else{
        intensity = 0.2
    } 
    //天空与光照环境颜色判断
    if (testTime < sunUp || testTime > sunDown) {
        sunColor.set(sunColorStore[5])
        enviColor.set(enviColorStore[5])
        skyColor = skyColorStore[5]
    }else if(sunUp <= testTime && testTime < (sunDown - 2)){
        //白天
        sunColor.set(sunColorStore[2])
        enviColor.set(enviColorStore[2])
        skyColor = skyColorStore[2]
    }else{
        //傍晚
        sunColor.set(sunColorStore[4])
        enviColor.set(enviColorStore[4])
        skyColor = skyColorStore[4]
    }
    //灯光与星空效果判断
    if (testTime <= sunUp + 1 || testTime >= sunDown - 1) {
        galaxy(scene)
        roadLights(scene)
    }

    a[0] = sunPosition
    a[1] = intensity
    a[2] = sunColor
    a[3] = enviColor
    a[4] = skyColor
    //返回多个值
    return a;
}

//星空效果
const parameters = {}
parameters.count = 1000
parameters.size = 1
function galaxy(scene){
    const geometry = new THREE.BufferGeometry()
    //每个点有三个坐标值
    const position = new Float32Array(parameters.count * 3)
    for( let i = 0; i < parameters.count; i++){
        const i3 = i * 3
        //位置信息
        position[i3    ] = (Math.random()-0.5) * (i * 2)
        position[i3 + 1] = (Math.random()-0.5) + (300 - i*0.2)
        position[i3 + 2] = (Math.random()-0.5) * (i * 2)
    }
    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(position, 3)
    )
    //材质
    const material = new THREE.PointsMaterial({
        size: parameters.size,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    })
    //星星
    const points = new THREE.Points(geometry, material)
    scene.add(points)
    return scene
}

//路灯效果
function roadLights(scene){
    let roadLight1 = new THREE.PointLight(0xFFE4B5, 0.4, 50)
    let roadLight2 = new THREE.PointLight(0xFFE4B5, 0.4, 50)
    let roadLight3 = new THREE.PointLight(0xFFE4B5, 0.4, 50)
    let roadLight4 = new THREE.PointLight(0xFFE4B5, 0.4, 50)
    let roadLight5 = new THREE.PointLight(0xFFE4B5, 0.4, 50)
    let roadLight6 = new THREE.PointLight(0xFFE4B5, 0.4, 50)
    let roadLight7 = new THREE.PointLight(0xFFE4B5, 0.4, 50)
    let roadLight8 = new THREE.PointLight(0xFFE4B5, 0.4, 50)
    let roadLight9 = new THREE.PointLight(0xFFE4B5, 0.4, 50)
    roadLight1.position.set(53, 16, -9.2)
    roadLight2.position.set(53, 16, 8.3)
    roadLight3.position.set(25, 16, -9.2)
    roadLight4.position.set(25, 16, 8.3)
    roadLight5.position.set(-30, 16, -9.2)
    roadLight6.position.set(-30, 16, 8.3)
    roadLight7.position.set(-60, 16, -9.2)
    roadLight8.position.set(-90, 16, -9.2)
    roadLight9.position.set(-120, 16, -9.2)
    scene.add(roadLight1,roadLight2,roadLight3,roadLight4,roadLight5,roadLight6,roadLight7,roadLight8,roadLight9)

}





