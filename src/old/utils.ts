export function stringToBoolean(str: string, def: boolean): boolean {
    if (str === "") {
      return def;
    }
    //  console.log("String=" + str)
    if (str.toLowerCase() === "true") {
      //    console.log("Returning true")
      return true;
    }
    // console.log("Returning false")
    // console.log("String=" + str)
    return false;
  }
  
  export function isUndefinedEmptyOrNull(str: string): boolean {
    if (str === undefined || str === null || str === "") {
      return true;
    }
    return false;
  }
  