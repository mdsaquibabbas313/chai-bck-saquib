import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

// no asynchandler since its internal method not a web req or network db call
const generateAccessAndRefreshToken = async(userId) => {
    try {
        // generation logic
        const user = User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        // refresh is save in db also
        // adding value in object 
        user.refreshToken = refreshToken
        // jus save it dont validate
        await user.save({validateBeforeSave : false})

        return {accessToken , refreshToken}
    } catch (error) {
        throw new ApiError(500 , "something went wrong while generating ref & access token")
    }
}

const registerUser = asyncHandler( async(req , res) => {
    
    // destructuring data from fronent in form type  
    // req.url is differnt when extraction from url
    const {fullName, email, username, password } = req.body
    //  console.log("email: ", email);
     console.log("Req.Body clg which comes from express" , req.body);

     if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // communicate with moongoose for checking already exist
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser) {
        throw new ApiError(409 , "User Already Exist with email & username")
    }

     console.log("Req.Files clg which comes from multer" , req.files);
    // in local path from multer still not in cloudinary
     const avatarLocalPath = req.files?.avatar[0]?.path;
    //  const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    // const mypdfLocalPath = req.files?.mypdf[0]?.path
    // console.log('File path:', mypdfLocalPath);
    // console.log('File path:', req.files);

    // my practise _> multer & cloud upload 
    // let mypdfLocalPath;
    // if (req.files && Array.isArray(req.files.mypdf) && req.files.mypdf.length > 0) {
    //     mypdfLocalPath = req.files.mypdf[0].path
    // }
    
     if(!avatarLocalPath) {
        throw new ApiError(400 , "Avatar not Uploaded")
     }


    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    // const mypdf = await uploadOnCloudinary(mypdfLocalPath)
    

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        // take only url not full response
        avatar: avatar.url,
        // since not validate then put empty
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )




})

const loginUser = asyncHandler( async(req , res) => {
    // algo
    // req body -> data
    // username or email check
    // find the user
    // password check
    //  generate access and refresh token which will be send to user
    //  send cookie


    const {username , email , password} = req.body

    if(!username && !email) {
        throw new ApiError(400 , "username or password is requird")
    }

    const user = await User.findOne({

        $or : [{ username } , { email }]
    })

    // ab bhi user nhii means not registered

    if(!user) {
        throw new ApiError(404 , "user does not exit")
    }

    // agar mil gya check password
    // user is instance of User DB
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError(401 , "invalid password")
    }

    // now generate access & refresh token

    // we made tokens gen code

    const {accessToken , refreshToken} = await generateAccessAndRefreshToken(user._id)

    // send in cookie

    // since we have to send only user & token 
    const loggedInUser = User.findById(user._id).select("-password -refreshToken")

    // COOKIE MODIFIED BY server only now
    const options = {
        httpOnly : true,
        secure : true
    }

    res
    .status(200)
    .cookie("accessToken" , accessToken , options)
    .cookie("refreshToken" , refreshToken , options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser , accessToken , refreshToken
            },
            "User Logged In Successfully"
        )
    )






})


const logoutUser = asyncHandler( async(req , res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res 
    .status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json(
        new ApiResponse(200 , {} , "User Loged out")
    )

})

export {
    registerUser,
    loginUser,
    logoutUser
    }