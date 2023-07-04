import { computed, ref } from "vue";

// 历史记录
export default function useRecords() {
    const records = ref<string[]>([])
    const currentIndex = ref<number>(-1)
    const currentRecord = computed(() => records.value[currentIndex.value])

    function addRecord(record: string) {
        records.value.push(record)
        currentIndex.value += 1
    }

    function clearRecord() {
        records.value = []
        currentIndex.value = -1
    }

    function undo() {
        records.value.pop()
        currentIndex.value -= 1
        return getRecord()
    }

    function go(steps: number) {
        if(currentIndex.value + steps < 0 || currentIndex.value + steps > records.value.length - 1) {
            console.log('超出范围，操作无效')
            return
        }
        currentIndex.value += steps
    }

    // 根据索引获取记录（默认获取当前记录）
    function getRecord(index = currentIndex.value) {
        return records.value[index]
    }

    function init() {
        let rawStr = records.value[0]
        records.value = [rawStr]
        currentIndex.value = 0
        return rawStr
    }

    return {
        records,
        addRecord,
        clearRecord,
        undo,
        go,
        getRecord,
        currentRecord,
        init
    }
}