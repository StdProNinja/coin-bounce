const Joi=require('joi')
const fs=require('fs')
const Blog=require('../models/blog')
const {BACKEND_SERVER_PATH}=require('../config/index')
const BlogDetailsDTO = require('../dto/blog-details')
const BlogDTO=require('../dto/blog')
const Comment=require('../models/comment')
const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;
const blogController={
    //create
    async create(req,res,next){
        //validate req body
        //handle photo
        //add to db
        //return response
        //client side se photo aayegi base64 encoded string me isko humdecode kar ke path save karenge db me
        const createBlogSchema = Joi.object({
            title: Joi.string().required(),
            author: Joi.string().regex(mongodbIdPattern).required(),
            content: Joi.string().required(),
            photo: Joi.string().required(),
          });
        const {error}=createBlogSchema.validate(req.body)
        if(error){
            return next(error)
        }
        const {title,author,content,photo}=req.body
        //photo read as buffer 
        const buffer=Buffer.from(photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ''),'base64')
        //alto random name photo
        const imagePath=`${Date.now()}-${author}.png`
        //save image in storage
        try{
            fs.writeFileSync(`storage/${imagePath}`,buffer)
        }catch(error){
            return next(error)
        }
        //save blog in db
        let newBlog
        try{
             newBlog=new Blog({
                title,
                author,
                content,
                photoPath:`${BACKEND_SERVER_PATH}/storage/${imagePath}`
            })
            await newBlog.save()
        }catch(error){
            return next(error)
        }
        const blogDto=new BlogDTO(newBlog)
        res.status(201).json({blogDto})
    },
    //get all
    async getAll(req,res,next){
        try{
            const blogs=await Blog.find({})
            const blogsDto=[]
            for(let i=0;i<blogs.length;i++){
                const dto=new BlogDTO(blogs[i])
                blogsDto.push(dto)
            }
            return res.status(200).json({blogs:blogsDto})
        }catch(error){
            return next(error)
        }
    },
    //get single
    async getById(req,res,next){
        //validate id
        const getByIdSchema=Joi.object({
            id:Joi.string().regex(mongodbIdPattern).required()
        })
        const {error}=getByIdSchema.validate(req.params)
        if(error){
            return next(error)
        }
        let blog
        const {id}=req.params
        try{
            blog=await Blog.findOne({_id:id}).populate('author')
        }catch(error){
            return next(error)
        }
        const blogDto=new BlogDetailsDTO(blog)
        return res.status(200).json({blog:blogDto})
    },
    //update
    async update(req,res,next){
        //vaidate req body
        const updateBlogSchema=Joi.object({
            title:Joi.string().required(),
            content:Joi.string().required(),
            author:Joi.string().regex(mongodbIdPattern).required(),
            blogId:Joi.string().regex(mongodbIdPattern).required(),
            photo:Joi.string()
        })
        const {error}=updateBlogSchema.validate(req.body)
        const {title,content,author,blogId,photo}=req.body
        let blog
        try{
             blog=await Blog.findOne({_id:blogId})
        }catch(error){
            return next(error)
        }
        if(photo){
            previousPhoto=blog.photoPath
            previousPhoto.split('/').at(-1)
            fs.unlinkSync(`storage/${previousPhoto}`)
            const buffer=Buffer.from(photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ''),'base64')
        //alto random name photo
        const imagePath=`${Date.now()}-${author}.png`
        //save image in storage
        try{
            fs.writeFileSync(`storage/${imagePath}`,buffer)
        }catch(error){
            return next(error)
        }
        await Blog.updateOne({_id:blogId},
            {title,content,photoPath:`${BACKEND_SERVER_PATH}/storage/${imagePath}`}
        )
        }
        else{
            await Blog.updateOne({_id:blogId},{title,content})
        }
        return res.status(200).json({message:'blog updated'})        
    },
    //delete
    async delete(req,res,next){
        const deleteBlogSchema=Joi.object({
            id:Joi.string().regex(mongodbIdPattern).required()
        })
        const {error}=deleteBlogSchema.validate(req.params)
        const {id}=req.params
        try{
           await Blog.deleteOne({_id:id})
           await Comment.deleteMany({blog:id})

        }catch(error){

        }
        return res.status(200).json({message:'Blog delete'})
    }
}
module.exports=blogController