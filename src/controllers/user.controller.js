import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
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

export {registerUser}