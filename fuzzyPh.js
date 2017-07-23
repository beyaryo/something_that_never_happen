var phGood, phBad, phToxic;
var tempLeft, tempRight;
var phValue = 10;

// Counting ph in good category
phGood = curve(phValue, 6.51, 6.51, 9, 10);

// Counting ph in bad category
tempLeft = curve(phValue, 2, 5, 6.5, 6.5);
tempRight = curve(phValue, 9, 10, 11, 11);

if(tempLeft > tempRight) phBad = tempLeft;
else phBad = tempRight;

// Counting ph in toxic category
tempLeft = curve(phValue, 1, 1, 2, 5);
tempRight = curve(phValue, 11.01, 11.01, 14, 14);

if(tempLeft > tempRight) phToxic = tempLeft;
else phToxic = tempRight;

console.log("Ph value : " +phValue);
console.log("Toxic : " +phToxic);
console.log("Bad : " +phBad);
console.log("Good : " +phGood);

function curve(x, min, peakStart, peakEnd, max){
    if(x < min || x > max){
        return 0;
    }else if(x >= peakStart && x <= peakEnd){
        return 1;
    }else if(x >= min && x < peakStart){
        return (x - min)/(peakStart - min);
    }else if(x > peakEnd && x <= max){
        return (max - x)/(max - peakEnd);
    }

    // if(x < min){
    //     return 0;
    // }else if(x >= peakStart && x <= peakEnd){
    //     return 1;
    // }else if(x >= min && x < peakStart){
    //     return (x - min)/(peakStart - min);
    // }else if(x > peakEnd && x <= max){
    //     return (max - x)/(max - peakEnd);
    // }else if(isCurveUp && x > max){
    //     return 1;
    // }else{
    //     return 0;
    // }
}