function confirmation(name) {
    const answer = confirm(`apakah kamu yakin menghapus data ${name} ?`)
    if(answer) {
        return true
    } else {
        return false
    }
}