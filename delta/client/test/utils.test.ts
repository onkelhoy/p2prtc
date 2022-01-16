import { 
  printerror,
  trycatch, 
} from 'utils/helper';

const print = printerror("test");

describe('printerror', () => {
  it("printerror should return a print function", () => {
    expect(typeof print).toBe("function");
  });
  it("printerror should log with format: 'name type-error ...errors'", () => {
    const consoleSpy = jest.spyOn(console, 'log');

    print("test", "test");

    expect(consoleSpy).toHaveBeenCalledWith("TEST test-error test");
  });
})
describe.skip("trycatch", () => {
  it("successfull should return null", async () => {
    const ans = await trycatch("")
  });
});