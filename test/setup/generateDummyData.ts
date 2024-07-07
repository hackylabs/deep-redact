import {dummyUser} from './dummyUser';

export const generateDummyData = async (count: number): Promise<unknown> => new Promise((resolve) => {
  if (count < 1) {
    resolve([]);
    return;
  }

  if (count === 1) {
    resolve(dummyUser);
    return;
  }

  resolve(Array.from({length: count}, () => dummyUser));
});
