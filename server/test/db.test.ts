// import mongoose from 'mongoose';
// import chalk from 'chalk';
// import * as dotenv from 'dotenv';

import { IUser } from '../types';
import * as db from './db';
import * as user from './user';

// dotenv.config({ path: __dirname+'../.env' });


// teardown
afterAll(() => {
  // console.log(chalk.yellow("database teardown"));
  db.manualclose();
});

let testuser: IUser|null = null;

describe("database user functions", () => {
  test("hello", () => {
    expect(true).toEqual(true);
  })
  // test("register user", async () => {
  //   testuser = await db.register({
  //     email: 'test@test.test',
  //     name: 'Tester',
  //     password: 'test123',
  //   });

  //   expect(testuser).not.toBeNull();
  // });
  // test("login user", async () => {
  //   const user = await db.login({ 
  //     email: 'test@test.test', 
  //     password: 'test123',
  //   });

  //   expect(user).not.toBeNull();
  // });

  // test("login false user", async () => {
  //   const user = await db.login({ 
  //     email: 'test@test.test', 
  //     password: 'test1234', // false password
  //   });
    
  //   expect(user).toBeNull();
  // });
  // test("register same user", async () => {
  //   const user = await db.register({
  //     email: 'test@test.test',
  //     name: 'Tester',
  //     password: 'test123',
  //   });

  //   expect(user).toBeNull();
  // });
  // test("updating user", async () => {
  //   expect(testuser).not.toBeNull();

  //   const user = await db.update({
  //     _id: (testuser as IUser)._id,
  //     password: 'test1234',
  //   });

  //   expect(user).not.toBeNull();
  //   expect(user?.password).not.toEqual(testuser?.password);
  //   expect(user?.password).not.toEqual('test1234');
  // });
  // test("removing user", async () => {
  //   const removed = await db.remove(testuser as IUser);

  //   expect(removed).toEqual(true);
  // });
})