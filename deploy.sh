#!/usr/bin/expect -f
set timeout 300
set password "fconfig1034"
set host "root@185.169.252.97"
set localDir "/Users/hangup2/apps/survivors-game-project/dist/"
set remoteDir "/home/docker/games/survivors"

puts "===> Cleaning remote directory: $remoteDir"
spawn ssh -o StrictHostKeyChecking=no $host "mkdir -p $remoteDir && rm -rf $remoteDir/*"
expect {
    "*assword:*" {
        send "$password\n"
        exp_continue
    }
    eof
}

puts "===> Deploying files using rsync from $localDir to $host:$remoteDir"
# Using rsync to ensure all directories and files are synced correctly
spawn rsync -avz -e "ssh -o StrictHostKeyChecking=no" $localDir $host:$remoteDir/
expect {
    "*assword:*" {
        send "$password\n"
        exp_continue
    }
    eof
}
puts "===> Deployment finished!
