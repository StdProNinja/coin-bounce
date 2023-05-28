const express=require('express')
const authController=require('../controller/authController')
const blogController=require('../controller/blogController')
const commentController=require('../controller/commentController')
const auth=require('../middlewares/auth')
const router=express.Router()
//testing
    router.get('/test',(req,res)=>{res.json({msg:'workig'})})
//user
//register
router.post('/register',authController.register)
//login
router.post('/login',authController.login)

//logout
router.post('/logout',auth,authController.logout)

//refresh
router.get('/refresh',authController.refresh)

//create blog 
router.post('/blog',auth,blogController.create)
//update blog
router.put('/blog',auth,blogController.update)
//read all blogs
router.get('/blog/all',auth,blogController.getAll)
//read single blog by id
router.get('/blog/:id',auth,blogController.getById)
//delete blog
router.delete('/blog/:id',auth,blogController.delete)
//create comment
router.post('/comment',auth,commentController.create)
//read comment by blog id 
router.get('/comment/:id',auth,commentController.getById)
module.exports=router