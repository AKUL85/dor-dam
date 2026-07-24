#include <bits/stdc++.h>
using namespace std;

bool isGood(long long n) {
    int d1 = -1, d2 = -1;
    while (n > 0) {
        int d = n % 10;
        n /= 10;
        if (d == d1 || d == d2) continue;
        if (d1 == -1) { d1 = d; continue; }
        if (d2 == -1) { d2 = d; continue; }
        return false;
    }
    return true;
}

int main() {
    // Pre-generate all good numbers from 2 to 10^9
    vector<long long> goods;
    for (int a = 0; a <= 9; a++) {
        for (int b = a; b <= 9; b++) {
            // BFS: generate all numbers using only digits {a, b}
            vector<long long> q;
            if (a > 0) q.push_back(a);
            if (b > a) q.push_back(b);
            for (int i = 0; i < (int)q.size(); i++) {
                long long v = q[i];
                if (v >= 2) goods.push_back(v);
                long long base = v * 10;
                if (base <= 1000000000LL) {
                    if (base + a <= 1000000000LL) q.push_back(base + a);
                    if (b > a && base + b <= 1000000000LL) q.push_back(base + b);
                }
            }
        }
    }
    sort(goods.begin(), goods.end());
    goods.erase(unique(goods.begin(), goods.end()), goods.end());

    int t;
    scanf("%d", &t);
    while (t--) {
        long long x;
        scanf("%lld", &x);
        for (long long y : goods) {
            if (isGood(x * y)) {
                printf("%lld\n", y);
                break;
            }
        }
    }
    return 0;
}
