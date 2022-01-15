/**
 * @jest-environment jsdom
 */

// ############ SETUP #####################

describe("http server", () => {

  it("should receive all networks", () => {

  });

  it("/api/network/:id should give specific network", () => {

  });

  it("requesting specific network that isnt there should return 404", () => {

  });

  it("all other http requests should result in 404", () => {

  });
})


// helper functions 

function wait(milliseconds: number = 100): Promise<void> {
  return new Promise(rs => {
    setTimeout(rs, milliseconds);
  })
}