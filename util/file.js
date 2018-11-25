const fs = require('fs');

exports.deleteFile = (filePath) => {
    //Remove the leading slash
    fs.unlink(filePath.substring(1), (err) => {
        if (err){
            console.log('Delete file error: ', err);
            next(err);
        }
    });
};