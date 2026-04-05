import validator from "validator";
import { Roles } from "../Utils/enums/usersRoles.js";
import Category from "../Models/Category.model.js";
//import * as httpStatus from "../Utils/HttpStatusText.ts";
//import { AppError } from "../Utils/AppError.ts";
const DISPOSABLE_EMAIL_DOMAINS = [
    'tempmail.com', 
    'guerrillamail.com', 
    '10minutemail.com',
    'throwaway.email', 
    'mailinator.com', 
    'maildrop.cc',
    'temp-mail.org',
    'getnada.com',
    'trashmail.com'
  ];

export const registerSchema = {
    "name.first": {
        isString: { errorMessage: "user's first name must be string!" },
        notEmpty: { errorMessage: 'you need to enter a "first name"' },
        isLength: { options: { min: 2, max: 32 }, errorMessage: "first name must be from 2 to 32 chars" }
    },
    "name.last": {
        isString: { errorMessage: "user's last name must be string!" },
        notEmpty: { errorMessage: 'you need to enter a "last name"' },
        isLength: { options: { min: 2, max: 32 }, errorMessage: "last name must be from 2 to 32 chars" }
    },
    userName: {
        trim: true,
        isString: { errorMessage: "Username must be a string" },
        notEmpty: { errorMessage: "Username is required" },
        isLength: { 
          options: { min: 5, max: 32 }, 
          errorMessage: "Username must be between 5 and 32 characters" 
        },
        matches: {
          options: /^[a-zA-Z0-9_]+$/,
          errorMessage: "Username can only contain letters, numbers, and underscores"
        }
      },
    dateOfBirth: {
        notEmpty: { errorMessage: 'you need to enter a "date"' },
        isDate: { 
          options: { 
            format: "DD-MM-YYYY", 
            strictMode: true 
          }, 
          errorMessage: 'you need to enter date in form "dd-mm-yyyy"' 
        },
        custom: {
          options: (value) => {
            const [day, month, year] = value.split('-');
            const birthDate = new Date(year, month - 1, day);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();

            
            
            if (age < 18) {
              throw new Error("You must be at least 18 years old");
            }
            
            if (age > 120) {
              throw new Error("Please enter a valid date of birth");
            }

            if (birthDate > today) {
                throw new Error("Date of birth cannot be in the future");
            }
            return true;
          }
        }
      },
    gender: {
        isBoolean: { errorMessage: "you need to enter gender 0 for male and 1 for female" },
        notEmpty: { errorMessage: 'you need to enter a "gender"' }
    },
    phoneNumber: {
        notEmpty: { errorMessage: "you need to enter a phone number" },
        isLength: { options: { min: 5, max: 32 }, errorMessage: "phone must be from 5 to 32 chars" },
        isMobilePhone: {
            options: ["ar-EG"],
            errorMessage: "phone number must be a valid Egyptian mobile number"
        }
    },
    email: {
        trim: true,
        normalizeEmail: true,
        isEmail: { errorMessage: "Please enter a valid email address" },
        notEmpty: { errorMessage: "Email is required" },
        isLength: { 
          options: { min: 5, max: 100 }, 
          errorMessage: "Email must be between 5 and 100 characters" 
        },
        custom: {
          options: (value) => {
            const domain = value.split('@')[1]?.toLowerCase();
            
            if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
              throw new Error("Disposable email addresses are not allowed");
            }
            
            return true;
          }
        }
      },
    password: {
    isString: { errorMessage: "Password must be a string" },
    notEmpty: { errorMessage: "Password is required" },
    isLength: { 
      options: { min: 8, max: 100 }, 
      errorMessage: "Password must be between 8 and 100 characters" 
       },
    matches: {
      options: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      errorMessage: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
       }
    },
    confirmPassword: {
        notEmpty: { errorMessage: "Please confirm your password" },
        custom: {
          options: (value, { req }) => {
            if (value !== req.body.password) {
              throw new Error("Passwords do not match");
            }
            return true;
          }
        }
      },
    role: {
        optional: true,
        isString: { errorMessage: "role must be string!" },
        isIn: { options: [Object.values(Roles)], errorMessage: `role must be one of: ${Object.values(Roles).join(', ')}` }
    },

    avatar: {
        optional: true,
        isString: { errorMessage: "avatar must be string!" },
        isURL: { errorMessage: "avatar must be a valid URL!" }
    },

    ssn: {
        notEmpty: { errorMessage: "you need to enter SSN" },
        isNumeric: { errorMessage: "SSN must be numeric" },
        isLength: { 
            options: { min: 14, max: 14 },
            errorMessage: "SSN must be 14 digits" 
        }
    },
    "address.government": {
        optional: true,
        isString: { errorMessage: "government must be string!" }
    },
    "address.city": {
        optional: true,
        isString: { errorMessage: "city must be string!" }
    },
    "address.street": {
        optional: true,
        isString: { errorMessage: "street must be string!" }
    },
    categoryId: {
        custom: {
            options: async (value, { req }) => {
                if (req.body.role === Roles.worker) {
                    if (!value) {
                        throw new Error("Category is required for workers");
                    }
                    const category = await Category.findById(value);
                    if (!category) {
                        throw new Error("Invalid category selected");
                    }
                } else if (value) {
                    const category = await Category.findById(value);
                    if (!category) {
                        throw new Error("Invalid category selected");
                    }
                }
                return true;
            }
        }
    }
};
export const confirmEmailSchema = {
    otp: {
      trim: true,
      notEmpty: { errorMessage: "OTP is required" },
      isLength: {
        options: { min: 6, max: 6 },
        errorMessage: "OTP must be exactly 6 digits"
      },
      isNumeric: { errorMessage: "OTP must contain only numbers" }
    }
  };

export const loginSchema = {
    email: {
        trim: true,
        normalizeEmail: true,
        isEmail: { errorMessage: "you need to enter Email format !" },
        notEmpty: { errorMessage: "you need to enter an Email !" },
        isLength: { options: { min: 5, max: 100 }, errorMessage: "email must be from 5 to 100 chars" }
    },
    password: {
        isString: { errorMessage: "password must be string!" },
        notEmpty: { errorMessage: "you need to enter a password !" },
        isLength: { options: { min: 8, max: 100 }, errorMessage: "password must be from 8 to 100 chars" }
    }
};
export const editUserSchema = {
  "name.first": {
    optional: true,
    trim: true,
    isString: { errorMessage: "First name must be a string" },
    isLength: { 
      options: { min: 2, max: 32 }, 
      errorMessage: "First name must be between 2 and 32 characters" 
    }
  },
  
  "name.last": {
    optional: true,
    trim: true,
    isString: { errorMessage: "Last name must be a string" },
    isLength: { 
      options: { min: 2, max: 32 }, 
      errorMessage: "Last name must be between 2 and 32 characters" 
    }
  },
  
  userName: {
    optional: true,
    trim: true,
    isString: { errorMessage: "Username must be a string" },
    isLength: { 
      options: { min: 5, max: 32 }, 
      errorMessage: "Username must be between 5 and 32 characters" 
    },
    matches: {
      options: /^[a-zA-Z0-9_]+$/,
      errorMessage: "Username can only contain letters, numbers, and underscores"
    }
  },
  
  dateOfBirth: {
    optional: true,
    isDate: { 
      options: { 
        format: "DD-MM-YYYY", 
        strictMode: true 
      }, 
      errorMessage: "Date must be in DD-MM-YYYY format" 
    },
    custom: {
      options: (value) => {
        const [day, month, year] = value.split('-');
        const birthDate = new Date(year, month - 1, day);
        const today = new Date();
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (birthDate > today) {
          throw new Error("Date of birth cannot be in the future");
        }
        
        if (age < 18) {
          throw new Error("You must be at least 18 years old");
        }
        
        if (age > 120) {
          throw new Error("Please enter a valid date of birth");
        }
        
        return true;
      }
    }
  },
  
  gender: {
    optional: true,
    custom: {
      options: (value) => {
        const validValues = [0, 1, '0', '1', 'male', 'female', 'M', 'F', 'm', 'f', false, true];
        const stringValue = String(value).toLowerCase();
        
        if (!validValues.some(v => String(v).toLowerCase() === stringValue)) {
          throw new Error("Gender must be: 0/false/male/M for male or 1/true/female/F for female");
        }
        
        return true;
      }
    }
  },
  
  phoneNumber: {
    optional: true,
    trim: true,
    isMobilePhone: {
      options: ["ar-EG"],
      errorMessage: "Phone number must be a valid Egyptian mobile number"
    }
  },
  
  "address.government": {
    optional: true,
    trim: true,
    isString: { errorMessage: "Government must be a string" }
  },
  
  "address.city": {
    optional: true,
    trim: true,
    isString: { errorMessage: "City must be a string" }
  },
  
  "address.street": {
    optional: true,
    trim: true,
    isString: { errorMessage: "Street must be a string" }
  },
  
  avatar: {
    optional: true,
    isString: { errorMessage: "Avatar must be a string (URL or path)" }
  },
  categoryId: {
    optional: true,
    isMongoId: { errorMessage: "Invalid Category ID format" },
    custom: {
      options: async (value) => {
        if (value) {
          const category = await Category.findById(value);
          if (!category) {
            throw new Error("Category not found");
          }
        }
        return true;
      }
    }
  }
};
export const forgotPasswordSchema = {
    email: {
        isEmail: {
            errorMessage: "Please provide a valid email"
        },
        notEmpty: {
            errorMessage: "Email is required"
        }
    }
};

export const resetPasswordSchema = {
    email: {
        isEmail: {
            errorMessage: "Please provide a valid email"
        },
        notEmpty: {
            errorMessage: "Email is required"
        }
    },
    otp: {
        notEmpty: {
            errorMessage: "OTP is required"
        },
        isLength: {
            options: { min: 6, max: 6 },
            errorMessage: "OTP must be 6 digits"
        },
        isNumeric: {
            errorMessage: "OTP must be numeric"
        }
    },
    newPassword: {
        isString: { errorMessage: "New password must be a string" },
        notEmpty: { errorMessage: "New password is required" },
        isLength: { 
          options: { min: 8, max: 100 }, 
          errorMessage: "Password must be between 8 and 100 characters" 
        },
        matches: {
          options: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          errorMessage: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
        }
    }
};