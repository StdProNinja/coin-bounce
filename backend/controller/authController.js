const Joi=require('joi')
const User=require('../models/user')
const bcrypt=require('bcryptjs')
const UserDTO = require('../dto/user')
const JWTService=require('../services/JWTService')
const RefreshToken=require('../models/token')
const passwordPattern=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/
const authController={
    //### register
    async register(req,res,next){
        // validate user input
        const userRegisterSchema=Joi.object({
            username:Joi.string().min(5).max(30).required(),
            name:Joi.string().max(30).required(),
            email:Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }),
            password:Joi.string().pattern(passwordPattern).required(),
            confirmPassword:Joi.ref('password')
        })
        const{error}=userRegisterSchema.validate(req.body)
        // if error in validation return error by middle ware
        if(error){
            return next(error)
        }
        //if email or username already registered or not
        const{username,name,email,password}=req.body
        try{
            const emailInUse=await User.exists({email})
            const usernameInUse=await User.exists({username})
            if(emailInUse){
                const error={
                    status:409,
                    message:'Email already registered'

                }
                return next(error)
            }
            if(usernameInUse){
                const error={
                    status:409,
                    message:'username already registered'

                }
                return next(error)
            }

        }catch(error){
            return next(error)
        }
        //password hash
        const hashedPassword=await bcrypt.hash(password,10)
        //store data in db
        let accessToken
        let refreshToken
        let user
       try{
        const userToRegister=new User({
            //key and value name same like name:name that's by  using single  as per JS rule
            username,
            email,
            name,
            password:hashedPassword
        })
         user = await userToRegister.save()
        //token generation
        accessToken=JWTService.signAccessToken({_id:user._id},'30m')
        refreshToken=JWTService.signRefreshToken({_id:user._id},'60m')
       }
       catch(error){
            return next(error)
       }
       //store refresh token in db
       await JWTService.storeRefreshToken(refreshToken,user._id)
       // set token in cookies
       res.cookie('accessToken',accessToken,{
        maxAge:1000*60*60*24,
        httpOnly:true
       })

       res.cookie('refreshToken',refreshToken,{
        maxAge:1000*60*60*24,
        httpOnly:true
       })
        //dto filter the data send only that which is required not the complete data
        const userDto=new UserDTO(user)
        // sending response
        return res.status(201).json({user:userDto,auth:true})

    },
    //### login
    async login(req,res,next){
        const userLoginSchema=Joi.object({
            username:Joi.string().min(5).max(30).required(),
            password:Joi.string().pattern(passwordPattern).required()
        })
        //validate user input
        const {error}=userLoginSchema.validate(req.body)
        //validation erro return with middleware
        if(error){
            return next(error)
        }
        //match username and password
        //always use try catch when db is used
        const {username,password}=req.body  
        let user 
        try{
                 user = await User.findOne({username:username})
                if(!user){
                    const error={
                        status:401,
                        message:'Invalid username'
                    }
                    return next(error)
                }
                //hash password
                const match=await bcrypt.compare(password,user.password)
                if(!match){
                    const error={
                        status:401,
                        message:'Invalid password'
                    }
                    return next(error)
                }
            }
            catch(error){
                return next(error)
            }
            const accessToken=JWTService.signAccessToken({_id:user._id},'30m')
            const refreshToken=JWTService.signRefreshToken({_id:user._id},'60m')
            //update refresh token in database
            try{
               await RefreshToken.updateOne({
                    _id:user._id
                },
                {token:refreshToken},
                {upsert:true}
                )
            }
            catch(error){
                return next(error)
            }
            
            // set token in cookies
                res.cookie('accessToken',accessToken,{
                    maxAge:1000*60*60*24,
                    httpOnly:true
                })

                res.cookie('refreshToken',refreshToken,{
                    maxAge:1000*60*60*24,
                    httpOnly:true
                })
            //dto filter the data send only that which is required not the complete data
            const userDto=new UserDTO(user)
        //return response
        return res.status(200).json({user:userDto,auth:true})
    },
    //logout
    async logout(req,res,next){
        //delete refresh token from db
        const {refreshToken}=req.cookies
        try{
            await RefreshToken.deleteOne({token:refreshToken})
        }catch(error){
            return next(error)
        }
        //delete cookie
        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')
        //send response
        res.status(200).json({user:null,auth:false})
    },
    //refreh token 
    async refresh(req,res,next){
        //get refresh token
        //verify token
        // generate new token
        //update db and return response

        const originalRefreshToken=req.cookies.refreshToken
        let id
        try{
            id=JWTService.verifyRefreshToken(originalRefreshToken)._id
        }catch(e){
            const error={
                status:401,
                message:'Unauthrized'
            }
            return next(error)
        }
        try{
            const match=RefreshToken.findOne({_id:id,token:originalRefreshToken})
            if(!match){
                const error={
                    status:401,
                    message:'Unauthrized'
                }
                return next(error)
            }
        }catch(e){
            const error={
                status:401,
                message:'Unauthrized'
            }
            return next(error)
        }
        try{
            const accessToken=JWTService.signAccessToken({_id:id},'30m')
            const refreshToken=JWTService.signRefreshToken({_id:id},'60m')
            await RefreshToken.updateOne({_id:id},{token:refreshToken})
            res.cookie('accessToken',accessToken,{
                maxAge:1000*60*60*24,
                httpOnly:true
            })
            res.cookie('refreshToken',refreshToken,{
                maxAge:1000*60*60*24,
                httpOnly:true
            })
        }catch(e){
            return next(e)
        }

        const user=await User.findOne({_id:id})
        const userDto=new UserDTO(user)
        return res.status(200).json({user:userDto,auth:true})
    }
    
}
module.exports=authController