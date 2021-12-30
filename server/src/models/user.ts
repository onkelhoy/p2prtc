import mongoose from "mongoose";
import bcrypt from 'bcrypt';
import chalk from 'chalk';

import { 
  IUser,
  IUserUpdate,
  ICredentials, 
  IUserRegisterInfo,
} from '../types';

const SALT_WORK_FACTOR = process.env.SALT || '10';

// create the schema
const UserSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true },
  password: { type: String, required: true, },
  email: { type: String, required: true, index: { unique: true } },
  score: { type: Number, default: 0 },
  status: { type: Number, default: 0 },
});

UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified("password")) return next();

  // generate a salt
  bcrypt.genSalt(Number(SALT_WORK_FACTOR), (err, salt) => {
    if (err) return next(err);

    // hash the password using our new salt
    bcrypt.hash(this.password, salt, (err, hash) => {
      if (err) return next(err);
      // override the cleartext password with the hashed one
      this.password = hash;
      next();
    });
  });
});
   
UserSchema.methods.comparePassword = function(candidatePassword:string) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return false;
    return isMatch;
  });
};
   
// https://stackoverflow.com/questions/14588032/mongoose-password-hashing
async function _login(credentials: ICredentials): Promise<UN> {
  const user = await Model.findOne({ email: credentials.email });
  if (user && user.comparePassword(credentials.password)) {
    return user;
  }
  return null;
}

async function _register(userdata: IUserRegisterInfo): Promise<UN> {
  return await Model.create(userdata);
}

async function _update(user: IUserUpdate): Promise<UN> {
  await Model.updateOne({ _id: user._id }, user, );
  return await Model.findOne({ _id: user._id });
}

async function _remove(user: IUserUpdate): Promise<boolean> {
  const res = await Model.deleteOne({ _id: user._id });
  return res.deletedCount === 1;
}

export const Model = mongoose.model<IUser>('User', UserSchema);
export const login = errorCheck<ICredentials, UN>(_login, "login");
export const register = errorCheck<IUserRegisterInfo, UN>(_register, "register");
export const update = errorCheck<IUserUpdate, UN>(_update, "update");
export const remove = errorCheck<IUserUpdate, boolean>(_remove, "remove");

// helper function 

type UN = IUser|null;
type Executor<I, O> = (input: I) => Promise<O>;
function errorCheck<I, O>(executor: Executor<I, O>, type: string) {
  return async function (input: I) {
    try {
      return await executor(input);
    }
    catch (error) {
      console.log(chalk.red(`db user ${type} error`), error);
      return null;
    }
  }
}