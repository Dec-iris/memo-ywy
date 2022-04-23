const express = require('express')

//实例化一个express实例
const app = express()
const http = require('http')
const server = http.createServer(app)

const { Server } = require('socket.io')
const io = new Server(server)

    //创建旋转和位置词典
    var positionDic = {}
    var rotationDic = {}
    var characterDic = {}
    //监听client创建链接并启用监听
    io.on('connection', (socket) => {
      //新用户接入，接受数据进入字典
      socket.on('newClient', (position, rotation, character, callback)=>{
        //给其他服务器发送新用户连接信息
        socket.broadcast.emit('addClient',socket.id, position, rotation, character)
        //字典更新
        positionDic[socket.id] = position
        rotationDic[socket.id] = rotation
        characterDic[socket.id] = character
        //第一次连接，回调三个参数字典
        callback({
          positionDic,
          rotationDic,
          characterDic
        })
      })    
      
      //任意用户位置发生变化都会更新位置字典
      socket.on('clientMove', (position, rotation) => {
        //将单独的更新位置信息传递给其他客户
        socket.broadcast.emit('otherClientMove', socket.id, position, rotation)
        positionDic[socket.id] = position
        rotationDic[socket.id] = rotation
      });
      
      //监听用户是否停止移动
      socket.on('stopMove', () => {
        //将client信息广播出去
        socket.broadcast.emit('stopClientMove',socket.id)
      });
      
      //监听client断开链接事件
      socket.on('disconnect', () => {
        socket.broadcast.emit('clientDisconnect',socket.id)
        //删除用户位置信息
        delete positionDic[socket.id]
        delete rotationDic[socket.id]
        delete characterDic[socket.id]
      });
    });

//将服务器开到8080端口
server.listen(8080, () => {
  console.log('listening on *:8080')
})
